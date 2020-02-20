import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators, FormGroup, FormArray } from '@angular/forms';
import { FormValidators } from './validators/form-validators';
import { startWith } from 'rxjs/operators';
import { GroupTypes } from './core/app.model';
import { init, interestedExperimentPoint, getExperimentCondition } from 'ees-client-lib';
import { environment } from 'src/environments/environment';

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

  // For Experiment Partition Information
  experimentPartitionForm: FormGroup;
  listOfExperimentPoints = [];
  displayedColumnsPoints = ['no', 'partitionName', 'partitionPoint', 'removePartition'];
  assignedConditions = [];

  // For Assigned Conditions
  displayedColumnMarkExperiment = ['no', 'point', 'name', 'conditionCode', 'assignmentWeight', 'description'];

  constructor(
    private _formBuilder: FormBuilder,
  ) {}

  ngOnInit() {

    // For initiating User
    this.groupList[0] = this.groupTypes; // To set all group types to first control
    this.userInitiateForm = this._formBuilder.group({
      id: [null, Validators.required],
      userGroups: this._formBuilder.array([this.getNewUserGroup()])
    }, { validators: FormValidators.validatePreviewUserForm });

    this.userInitiateForm.get('userGroups').valueChanges.pipe(startWith(null)).subscribe((value) => {
      if (value) {
        for (let i = 0; i < value.length; i++) {
           this.groupList[i] = this.getGroupsForFormArray(i, this.groupTypes);
        }
      }
    });

    // For Experiment Partition Information
    this.experimentPartitionForm = this._formBuilder.group({
      partitions: this._formBuilder.array([this.getNewPartitionInfo()])
    });

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
    const group = this.selectedUser.userGroups.reduce((acc, value) => {
      return value.groupType === GroupTypes.OTHER
        ? { ...acc, [value.customGroupName]: value.groupId }
        : { ...acc, [value.groupType]: value.groupId };
    }, {});
    this.userInitiateForm.get('id').reset();
    this.userGroups.clear();
    this.userGroups.push(this.getNewUserGroup());
    const data = {
      userId: this.selectedUser.id,
      userEnvironment: group
    }
    await init(environment.endpointApi, data);
    await interestedExperimentPoint([]);
    this.fetchExperimentConditions();
  }

  groupTypeValue(index: number) {
    return this.userInitiateForm.get('userGroups').value[index].groupType === GroupTypes.OTHER;
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
  markSelectedExperimentPartition() {
  }
}
