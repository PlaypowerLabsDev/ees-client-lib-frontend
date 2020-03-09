import { Component, OnInit } from '@angular/core';
import { FormGroup, Validators, FormBuilder, FormArray } from '@angular/forms';
import { GroupTypes } from './core/app.model';
import { FormValidators } from './validators/form-validators';
import { environment } from 'src/environments/environment';
import { init, setGroupMembership, setWorkingGroup, getExperimentCondition, getAllExperimentConditions, markExperimentPoint } from 'ees-client-lib';
import { startWith, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  // For initiating user
  userInitiateForm: FormGroup;
  selectedUser: any;
  groupTypes = [
    { value: GroupTypes.CLASS },
    { value: GroupTypes.DISTRICT },
    { value: GroupTypes.SCHOOL },
    { value: GroupTypes.OTHER }
  ];
  // Used to maintain selected groups
  groupList = [];

  // For Setting group membership
  groupMemberShipForm: FormGroup;

  // For Setting Working Group
  workingGroupForm: FormGroup;
  workingGroupList = [];

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

  ngOnInit() {

    // For initiating User
    this.groupList[0] = this.groupTypes; // To set all group types to first control
    this.userInitiateForm = this._formBuilder.group({
      id: [null, Validators.required],
      // userGroups: this._formBuilder.array([this.getNewUserGroup()]),
    });

    // this.userInitiateForm.get('userGroups').valueChanges.pipe(startWith(null)).subscribe((value) => {
    //   if (value) {
    //     for (let i = 0; i < value.length; i++) {
    //        this.groupList[i] = this.getGroupsForFormArray(i, this.groupTypes);
    //     }
    //   }
    // });

    // Set Group Member ship
    this.groupMemberShipForm = this._formBuilder.group({
      userGroups: this._formBuilder.array([this.getNewUserGroup()])
    });

    // Set Working Group
    this.workingGroupList[0] = this.groupTypes;
    this.workingGroupForm = this._formBuilder.group({
      workingGroups: this._formBuilder.array([this.getNewUserGroup()])
    }, { validators: FormValidators.validatePreviewUserForm });

    this.workingGroupForm.get('workingGroups').valueChanges.pipe(startWith(null)).subscribe((value) => {
      if (value) {
        for (let i = 0; i < value.length; i++) {
           this.workingGroupList[i] = this.getWorkingGroupsFromArray(i, this.groupTypes);
        }
      }
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
  getGroupsForFormArray(i, groupList) {
    let groupValue;
    if (this.userInitiateForm.get('userGroups').value[i - 1]) {
      groupValue = this.userInitiateForm.get('userGroups').value[i - 1].groupType;
    }
    return i === 0 ? groupList : this.groupList[i - 1].filter(group => group.value !== groupValue || group.value === GroupTypes.OTHER);
  }

  getNewUserGroup() {
    return this._formBuilder.group({
      groupType: [null, Validators.required],
      customGroupName: [null],
      groupId: [null, Validators.required]
    }, { validators: FormValidators.validatePreviewUserGroupForm });
  }

  get userGroups(): FormArray {
    return this.userInitiateForm.get('userGroups') as FormArray;
  }

  addNewUserGroup() {
    this.userGroups.push(this.getNewUserGroup());
  }

  removeUserGroup(index: number) {
    this.userGroups.removeAt(index);
  }

  async initiateUser() {
    this.selectedUser = this.userInitiateForm.value;
    // const group = this.selectedUser.userGroups.reduce((acc, value) => {
    //   return value.groupType === GroupTypes.OTHER
    //     ? { ...acc, [value.customGroupName]: value.groupId }
    //     : { ...acc, [value.groupType]: value.groupId };
    // }, {});
    this.userInitiateForm.get('id').reset();
    // this.userGroups.clear();
    // this.userGroups.push(this.getNewUserGroup());
    const data = {
      userId: this.selectedUser.id
      // userEnvironment: group
    };
    await init(data.userId, environment.endpointApi);
    this.fetchExperimentConditions();
  }

  groupTypeValue(index: number) {
    return this.userInitiateForm.get('userGroups').value[index].groupType === GroupTypes.OTHER;
  }

  // Set Group Member ship
  get userGroupsForMemberShip(): FormArray {
    return this.groupMemberShipForm.get('userGroups') as FormArray;
  }

  addNewUserGroupForMemberShip() {
    this.userGroupsForMemberShip.push(this.getNewUserGroup());
  }

  removeUserGroupForMemberShip(index: number) {
    this.userGroupsForMemberShip.removeAt(index);
  }

  groupTypeValueForMemberShip(index: number) {
    return this.groupMemberShipForm.get('userGroups').value[index].groupType === GroupTypes.OTHER;
  }

  async setGroupMemberShip() {
    let groups = {};
    this.groupMemberShipForm.value.userGroups.forEach(group => {
      const groupName = group.groupType === GroupTypes.OTHER ? group.customGroupName : group.groupType;
      groups = Object.keys(groups).indexOf(groupName) === -1 ? {
        ...groups,
        [groupName]: [group.groupId]
      } : groups = {
        ...groups,
        [groupName]: [ ...groups[groupName], group.groupId ]
      };
    });
    this.userGroupsForMemberShip.clear();
    this.addNewUserGroupForMemberShip();
    const response = await setGroupMembership(groups);
    if (response.status) {
      this.openSnackBar('Group Membership is set successfully', 'Ok');
    }
  }

  // For Working Group
  getWorkingGroupsFromArray(i, groupList) {
    let groupValue;
    if (this.workingGroupForm.get('workingGroups').value[i - 1]) {
      groupValue = this.workingGroupForm.get('workingGroups').value[i - 1].groupType;
    }
    return i === 0 ? groupList : this.workingGroupList[i - 1].filter(group => group.value !== groupValue || group.value === GroupTypes.OTHER);
  }

  get workingGroup(): FormArray {
    return this.workingGroupForm.get('workingGroups') as FormArray;
  }

  addNewWorkingGroup() {
    this.workingGroup.push(this.getNewUserGroup());
  }

  removeWorkingGroup(index: number) {
    this.workingGroup.removeAt(index);
  }

  groupTypeValueForWorkingGroup(index: number) {
    return this.workingGroupForm.get('workingGroups').value[index].groupType === GroupTypes.OTHER;
  }

  async setWorkingGroup() {
    let workingGroup = {};
    this.workingGroupForm.value.workingGroups.forEach(group => {
      const groupName = group.groupType === GroupTypes.OTHER ? group.customGroupName : group.groupType;
      workingGroup = {
        ...workingGroup,
        [groupName]: group.groupId
      }
    });
    this.workingGroup.clear();
    this.addNewWorkingGroup();
    const response = await setWorkingGroup(workingGroup);
    if (response.status) {
      this.openSnackBar('Working Group is set successfully', 'Ok');
    }
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
    console.log('Response of mark Experiment ', response);
  }

  // For refresh getAllExperimentConditions
  // async refreshConditions() {
  //   await getAllExperimentConditions();
  //   this.fetchExperimentConditions();
  // }
}
