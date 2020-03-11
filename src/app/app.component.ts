import { Component, OnInit, ViewChild } from '@angular/core';
import { FormGroup, Validators, FormBuilder, FormArray } from '@angular/forms';
import { environment } from 'src/environments/environment';
import { init, setGroupMembership, setWorkingGroup, getExperimentCondition, getAllExperimentConditions, markExperimentPoint } from 'ees-client-lib';
import { startWith, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { JsonEditorComponent, JsonEditorOptions } from 'ang-jsoneditor';
import isEmpty from 'lodash.isempty';

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
  userInitializationError: string;

  // For Setting GroupMemberShip
  optionsForSettingGroupMembership = new JsonEditorOptions();
  hasSettingGroupMemberShipError = false;
  groupMemberShipError: string;

  // For Setting Working Group
  optionsForSettingWorkingGroup = new JsonEditorOptions();
  hasSettingWorkingGroupError = false;
  workingGroupError: string;

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
    };
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
      markExperimentName: [null]
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
      const result = partition.partitionName ? await getExperimentCondition(partition.partitionPoint, partition.partitionName) : await getExperimentCondition(partition.partitionPoint) ;
      this.assignedConditions.push(...result.data);
    });
  }

  // For Initiating User
  async initiateUser() {
    this.selectedUser = null;
    this.userInitializationError = null;

    const userGroups = this.initialUserGroupEditor.get();
    const workingGroup = this.initialWorkingGroupEditor.get();
    let context: any = isEmpty(userGroups) ? {} : { group: userGroups };
    context = isEmpty(workingGroup) ? { ...context } : { ...context, workingGroup };

    this.initialUserGroupEditor.set({} as any);
    this.initialWorkingGroupEditor.set({} as any);

    const { id } = this.userInitiateForm.value;
    const response = await init(id, environment.endpointApi, context);
    if (response.status) {
      this.selectedUser = this.userInitiateForm.value;
    }
    this.userInitiateForm.reset();
    this.userInitializationError = response.status ? null : response.message;
    (response.status) ? this.openSnackBar('User is initialized successfully', 'Ok') : this.openSnackBar('User initialization failed', 'Ok');
    this.fetchExperimentConditions();
  }

  // Set Group Member ship
  async setGroupMemberShip() {
    this.groupMemberShipError = null;
    const userGroups = this.groupMemberships.get();
    this.groupMemberships.set({} as any);
    const response = await setGroupMembership(userGroups);
    this.fetchExperimentConditions();
    this.groupMemberShipError = response.status ? null : response.message;
    response.status ? this.openSnackBar('Group Membership is set successfully', 'Ok') : this.openSnackBar('Group Membership failed', 'Ok');
  }

  // For Working Group
  async setWorkingGroup() {
    this.workingGroupError = null;
    const workingGroup = this.workingGroups.get();
    this.workingGroups.set({} as any);
    const response = await setWorkingGroup(workingGroup);
    this.workingGroupError = response.status ? null : response.message;
    this.fetchExperimentConditions();
    response.status ? this.openSnackBar('Working Group is set successfully', 'Ok') : this.openSnackBar('Working Group failed', 'Ok');
  }

  // For Experiment Partition Information
  getNewPartitionInfo() {
    return this._formBuilder.group({
      partitionPoint: [null, Validators.required],
      partitionName: [null]
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
    return this.listOfExperimentPoints.filter(state => state[type] && state[type].toLowerCase().indexOf(filterValue) === 0);
  }

  async markExperiment() {
    const { markExperimentPoint: point, markExperimentName } = this.markExperimentForm.value;
    this.markExperimentForm.reset();
    const response = markExperimentName ? await markExperimentPoint(point, markExperimentName) : await markExperimentPoint(point) ;
    response.status ? this.openSnackBar('Experiment point is marked successfully', 'Ok') : this.openSnackBar('Mark experiment point failed', 'Ok');
  }

  // For refresh getAllExperimentConditions
  async getAllExperimentConditions() {
    const response = await getAllExperimentConditions();
    if (response.status) {
      this.openSnackBar('GetAllExperimentConditions is executed successfully', 'Ok');
    }
    this.fetchExperimentConditions();
  }
}
