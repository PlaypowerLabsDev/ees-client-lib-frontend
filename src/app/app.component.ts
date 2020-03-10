import { Component, OnInit, ViewChild } from '@angular/core';
import { FormGroup, Validators, FormBuilder, FormArray } from '@angular/forms';
import { environment } from 'src/environments/environment';
import { init, setGroupMembership, setWorkingGroup, getExperimentCondition, getAllExperimentConditions, markExperimentPoint } from 'ees-client-lib';
import { startWith, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { JsonEditorComponent, JsonEditorOptions } from 'ang-jsoneditor';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  @ViewChild('initialUserGroupEditor', { static: false }) initialUserGroupEditor: JsonEditorComponent;
  @ViewChild('initialWorkingGroupEditor', { static: false }) initialWorkingGroupEditor: JsonEditorComponent;
  @ViewChild('groupMemberships', { static: false }) groupMemberships: JsonEditorComponent;
  @ViewChild('workingGroups', { static: false }) workingGroups: JsonEditorComponent;
  options = new JsonEditorOptions();

  // For initiating user
  userInitiateForm: FormGroup;
  selectedUser: any;
  optionsForInitialUserGroups = new JsonEditorOptions();
  optionsForInitialWorkingGroups = new JsonEditorOptions();
  hasInitialUserGroupsError = false;
  hasInitialWorkingGroupError = false;

  // For Setting GroupMemberShip
  optionsForSettingGroupMembership = new JsonEditorOptions();
  hasSettingGroupMemberShipError = false;

  // For Setting Working Group
  optionsForSettingWorkingGroup = new JsonEditorOptions();
  hasSettingWorkingGroupError = false;

  // For Experiment Partition Information
  experimentPartitionForm: FormGroup;
  listOfExperimentPoints = [];
  displayedColumnsPoints = ['no', 'partitionName', 'partitionPoint', 'removePartition'];
  assignedConditions = [];

  // For Assigned Conditions
  displayedColumnMarkExperiment = ['no', 'point', 'name', 'conditionCode', 'assignmentWeight', 'description'];

  // For Mark Experiment
  markExperimentForm: FormGroup;
  filterMarkExperimentPoints$: Observable<any[]>;
  filterMarkExperimentNames$: Observable<any[]>;

  constructor(
    private _formBuilder: FormBuilder,
    private _snackBar: MatSnackBar
  ) {}

  openSnackBar(message: string, action: string) {
    this._snackBar.open(message, action, {
      duration: 2000,
    });
  }

  setChangeEvent(optionTypes, errorVariable, editorType) {
    this[optionTypes].onChange = () => {
      try {
        this[editorType].get();
        this[errorVariable] = false;
      } catch (e) {
        this[errorVariable] = true;
      }
    }
  }

  ngOnInit() {
    this.options.mode = 'code';
    this.optionsForInitialUserGroups = {
      ...this.options
    };
    this.optionsForInitialWorkingGroups = {
      ...this.options
    };
    this.optionsForSettingGroupMembership = {
      ...this.options
    };
    this.optionsForSettingWorkingGroup = {
      ...this.options
    }
    this.setChangeEvent('optionsForInitialUserGroups', 'hasInitialUserGroupsError', 'initialUserGroupEditor');
    this.setChangeEvent('optionsForInitialWorkingGroups', 'hasInitialWorkingGroupError', 'initialWorkingGroupEditor');
    this.setChangeEvent('optionsForSettingGroupMembership', 'hasSettingGroupMemberShipError', 'groupMemberships');
    this.setChangeEvent('optionsForSettingWorkingGroup', 'hasSettingWorkingGroupError', 'workingGroups');

    this.userInitiateForm = this._formBuilder.group({
      id: [null, Validators.required],
    });

    // For Experiment Partition Information
    this.experimentPartitionForm = this._formBuilder.group({
      partitions: this._formBuilder.array([this.getNewPartitionInfo()])
    });

    // For Mark Experiment
    this.markExperimentForm = this._formBuilder.group({
      markExperimentPoint: [null, Validators.required],
      markExperimentName: [null, Validators.required]
    });

    this.filterMarkExperimentNames$ = this.markExperimentForm.get('markExperimentName').valueChanges
      .pipe(
        startWith(''),
        map(state => state ? this._filterMarkExperimentPoints(state, 'partitionName') : this.listOfExperimentPoints.slice())
      );

    this.filterMarkExperimentPoints$ = this.markExperimentForm.get('markExperimentPoint').valueChanges
      .pipe(
        startWith(''),
        map(state => state ? this._filterMarkExperimentPoints(state, 'partitionPoint') : this.listOfExperimentPoints.slice() )
      );
  }

  async fetchExperimentConditions() {
    this.assignedConditions = [];
    this.listOfExperimentPoints.forEach( async (partition) => {
      const result = await getExperimentCondition(partition.partitionName, partition.partitionPoint);
      this.assignedConditions.push(...result.data);
    });
  }

  // For Initiating User
  async initiateUser() {
    // Call set working groups and group member ship
    this.initialUserGroupEditor.set({} as any);
    this.initialWorkingGroupEditor.set({} as any);
    this.selectedUser = this.userInitiateForm.value;
    this.userInitiateForm.get('id').reset();
    const response = await init(this.selectedUser.id, environment.endpointApi);
    (response.status) ? this.openSnackBar('User is initialized successfully', 'Ok') : this.openSnackBar('User initialization failed', 'Ok');
    this.fetchExperimentConditions();
  }

  // Set Group Member ship
  async setGroupMemberShip() {
    const userGroups = this.groupMemberships.get();
    this.groupMemberships.set({} as any);
    const response = await setGroupMembership(userGroups);
    response.status ? this.openSnackBar('Group Membership is set successfully', 'Ok') : this.openSnackBar('Group Membership failed', 'Ok');
  }

  // For Working Group
  async setWorkingGroup() {
    const workingGroup = this.workingGroups.get();
    this.workingGroups.set({} as any);
    const response = await setWorkingGroup(workingGroup);
    response.status ? this.openSnackBar('Working Group is set successfully', 'Ok') : this.openSnackBar('Working Group failed', 'Ok');
  }

  // For Experiment Partition Information
  getNewPartitionInfo() {
    return this._formBuilder.group({
      partitionName: [null, Validators.required],
      partitionPoint: [null, Validators.required]
    });
  }

  get partitionInfo(): FormArray {
    return this.experimentPartitionForm.get('partitions') as FormArray;
  }

  addNewPartition() {
    this.partitionInfo.push(this.getNewPartitionInfo());
  }

  removePartition(index: number) {
    this.partitionInfo.removeAt(index);
  }

  savePartitionInfo() {
    this.listOfExperimentPoints = [...this.listOfExperimentPoints, ...this.experimentPartitionForm.value.partitions];
    this.partitionInfo.clear();
    this.addNewPartition();
    if (this.selectedUser) {
      this.fetchExperimentConditions();
    }
  }

  removePartitionFromSavedList(index: number) {
    this.listOfExperimentPoints.splice(index, 1);
    this.listOfExperimentPoints = JSON.parse(JSON.stringify(this.listOfExperimentPoints));
    this.fetchExperimentConditions();
  }

  // For Mark Experiment
  private _filterMarkExperimentPoints(value: string, type: string): any[] {
    const filterValue = value.toLowerCase();
    return this.listOfExperimentPoints.filter(state => state[type].toLowerCase().indexOf(filterValue) === 0);
  }

  async markExperiment() {
    const { markExperimentPoint: point, markExperimentName } = this.markExperimentForm.value;
    this.markExperimentForm.reset();
    const response = await markExperimentPoint(markExperimentName, point);
    if (response.status) {
      this.openSnackBar('Experiment point is marked successfully', 'Ok');
    }
    console.log('Response of mark Experiment ', response);
  }

  // For refresh getAllExperimentConditions
  async getAllExperimentConditions() {
    await getAllExperimentConditions();
    this.fetchExperimentConditions();
  }
}
