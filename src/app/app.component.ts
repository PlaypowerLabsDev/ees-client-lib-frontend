import { Component, OnInit, ViewChild } from '@angular/core';
import { FormGroup, Validators, FormBuilder, FormArray } from '@angular/forms';
import { startWith, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { JsonEditorComponent, JsonEditorOptions } from 'ang-jsoneditor';
import { UpgradeClient } from 'upgrade_client_lib';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  upClient: any;
  @ViewChild('groupMemberships', { static: false }) groupMemberships: JsonEditorComponent;
  @ViewChild('workingGroups', { static: false }) workingGroups: JsonEditorComponent;
  @ViewChild('logJsonEditor', { static: false }) logJsonEditor: JsonEditorComponent;
  @ViewChild('metricsJsonEditor', { static: false }) metricsJsonEditor: JsonEditorComponent;
  options = new JsonEditorOptions();

  // Set host URL
  setHostURLForm: FormGroup;

  // For initiating user
  userInitiateForm: FormGroup;
  selectedUser: any;

  // For setting alternative user Ids
  altUserIdsForm: FormGroup;

  // For Setting GroupMemberShip
  optionsForSettingGroupMembership = new JsonEditorOptions();
  hasSettingGroupMemberShipError = false;

  // For Setting Working Group
  optionsForSettingWorkingGroup = new JsonEditorOptions();
  hasSettingWorkingGroupError = false;

  // For GetAllExperimentConditions
  getAllExperimentConditionsForm: FormGroup;

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

  // For Report Error from Client
  failedExperimentPointForm: FormGroup;

  // For Logging
  logForm: FormGroup;
  optionsForLog = new JsonEditorOptions();
  hasOptionsForLogError = false;

  // For adding metrics
  optionsForMetrics = new JsonEditorOptions();
  hasOptionsForMetricsError = false;

  // For Feature Flags
  displayedColumnFeatureFlags = ['no', 'name', 'key', 'status', 'type', 'activeVariation'];
  featureFlagList = [];

  constructor(
    private _formBuilder: FormBuilder,
    private _snackBar: MatSnackBar
  ) { }

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
    this.optionsForSettingGroupMembership = {
      ...this.options
    };
    this.optionsForSettingWorkingGroup = {
      ...this.options
    };
    this.optionsForLog = {
      ...this.options
    };
    this.optionsForMetrics = {
      ...this.options
    }
    this.setChangeEvent('optionsForSettingGroupMembership', 'hasSettingGroupMemberShipError', 'groupMemberships');
    this.setChangeEvent('optionsForSettingWorkingGroup', 'hasSettingWorkingGroupError', 'workingGroups');
    this.setChangeEvent('optionsForLog', 'hasOptionsForLogError', 'logJsonEditor');
    this.setChangeEvent('optionsForMetrics', 'hasOptionsForMetricsError', 'metricsJsonEditor');

    this.setHostURLForm = this._formBuilder.group({
      hostUrl: [null, Validators.required],
    });

    this.userInitiateForm = this._formBuilder.group({
      id: [null, Validators.required],
    });

    this.altUserIdsForm = this._formBuilder.group({
      ids: this._formBuilder.array([this.getAltUserIdControl()])
    });

    this.getAllExperimentConditionsForm = this._formBuilder.group({
      context: [null, Validators.required]
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
        map(state => state ? this._filterMarkExperimentPoints(state, 'partitionPoint') : this.listOfExperimentPoints.slice())
      );

    this.failedExperimentPointForm = this._formBuilder.group({
      experimentPoint: [null, Validators.required],
      reason: [null, Validators.required],
      partitionId: [null]
    });

    // For logging
    this.logForm = this._formBuilder.group({
      key: [null, Validators.required],
      type: [null, Validators.required],
      value: [null]
    });

    this.logForm.get('type').valueChanges.subscribe(val => {
      if (val === 'string') {
        this.logForm.get('value').setValidators([Validators.required]);
      } else {
        this.logForm.get('value').setValidators([]);
      }
    });
  }

  async fetchExperimentConditions() {
    this.assignedConditions = [];
    this.listOfExperimentPoints.forEach(async (partition) => {
      const result = partition.partitionName ?
        await this.upClient.getExperimentCondition(partition.partitionPoint, partition.partitionName)
        : await this.upClient.getExperimentCondition(partition.partitionPoint);
      if (result) {
        this.assignedConditions.push(result);
      }
    });
  }

  setHostUrl() {
    const { hostUrl } = this.setHostURLForm.value;
    UpgradeClient.setHostUrl(hostUrl.trim());
    this.setHostURLForm.reset();
    this.openSnackBar('Host URL is set successfully', 'Ok');
  }

  // For Initiating User
  async initiateUser() {
    this.selectedUser = null;
    this.assignedConditions = [];
    let { id } = this.userInitiateForm.value;
    this.userInitiateForm.reset();
    id = id.trim();
    this.upClient = new UpgradeClient(id, 'AUTH_TOKEN');
    this.selectedUser = id;
    this.openSnackBar('User is initialized successfully', 'Ok');
  }

  // For Setting alternative User ids
  getAltUserIdControl() {
    return this._formBuilder.group({
      altId: [null, Validators.required]
    });
  }

  get altIdsInfo(): FormArray {
    return this.altUserIdsForm.get('ids') as FormArray;
  }

  addNewAltUserId() {
    this.altIdsInfo.push(this.getAltUserIdControl());
  }

  removeAltUserId(index: number) {
    this.altIdsInfo.removeAt(index);
  }

  async setAltUserIds() {
    const { ids } = this.altUserIdsForm.value;
    this.altIdsInfo.clear();
    this.addNewAltUserId();
    const altUserIds = ids.map(id => id.altId);
    // TODO: Call api end point
    const response = await this.upClient.setAltUserIds(altUserIds);
    (response)
      ? this.openSnackBar('Setting alternate user ids successfully', 'Ok')
      : this.openSnackBar('Setting alternate user ids failed', 'Ok');
  }

  // Set Group Member ship
  async setGroupMemberShip() {
    // this.groupMemberShipError = null;
    const userGroups = this.groupMemberships.get();
    this.groupMemberships.set({} as any);
    const groupMap = this.convertObjectToMap(userGroups);
    const response = await this.upClient.setGroupMembership(groupMap);
    (response.id)
      ? this.openSnackBar('Group Membership is set successfully', 'Ok')
      : this.openSnackBar('Group Membership failed', 'Ok');
    this.fetchExperimentConditions();
  }

  // For Working Group
  async setWorkingGroup() {
    // this.workingGroupError = null;
    const workingGroup = this.workingGroups.get();
    this.workingGroups.set({} as any);
    const workingGroupMap = this.convertObjectToMap(workingGroup);
    const response = await this.upClient.setWorkingGroup(workingGroupMap);
    (response.id)
      ? this.openSnackBar('Working Group is set successfully', 'Ok')
      : this.openSnackBar('Working Group failed', 'Ok');
    this.fetchExperimentConditions();
  }

  convertObjectToMap(obj) {
    const objMap = new Map();
    Object.keys(obj).forEach((key) => {
      objMap.set(key, obj[key]);
    });
    return objMap;
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
    this.experimentPartitionForm.value.partitions = this.experimentPartitionForm.value.partitions.map(partition => {
      partition.partitionPoint = partition.partitionPoint.trim();
      partition.partitionName = !!partition.partitionName ? partition.partitionName.trim() : partition.partitionName;
      return partition;
    });
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
    const response = markExperimentName
      ? await this.upClient.markExperimentPoint(point, markExperimentName)
      : await this.upClient.markExperimentPoint(point);
    (response.userId)
      ? this.openSnackBar('Experiment point is marked successfully', 'Ok')
      : this.openSnackBar('Mark experiment point failed', 'Ok');
  }

  // For Logging
  async log() {
    const { key, type } = this.logForm.value;
    let { value } = this.logForm.value;
    let loggingValueObject;
    if (type === 'json') {
      loggingValueObject = this.logJsonEditor.get();
      this.logJsonEditor.set({} as any);
    }
    this.logForm.reset();
    value = type === 'string' ? value : loggingValueObject;
    const response = await this.upClient.log(key, value);
    !!response
    ? this.openSnackBar('Logged successfully', 'Ok')
    : this.openSnackBar('Logged failed', 'Ok');
  }

  // For adding metrics
  async addMetrics() {
    const metrics = this.metricsJsonEditor.get();
    this.metricsJsonEditor.set({} as any);
    console.log('Metrics,', metrics);
  }

  // For Report error from client
  async reportError() {
    const { experimentPoint, reason, partitionId } = this.failedExperimentPointForm.value;
    this.failedExperimentPointForm.reset();
    const response = partitionId
      ? await this.upClient.failedExperimentPoint(experimentPoint, reason, partitionId)
      : await this.upClient.failedExperimentPoint(experimentPoint, reason);
    (response.message)
      ? this.openSnackBar('Error from client reported successfully', 'Ok')
      : this.openSnackBar('Report error from client failed', 'Ok');
  }

  // For refresh getAllExperimentConditions
  async getAllExperimentConditions() {
    let { context } = this.getAllExperimentConditionsForm.value;
    context = context.trim();
    const response = await this.upClient.getAllExperimentConditions(context);
    if (Array.isArray(response)) {
      this.openSnackBar('GetAllExperimentConditions is executed successfully', 'Ok');
    }
    this.fetchExperimentConditions();
  }

  // For Feature flags
  async getAllFeatureFlags() {
    const featureFlags = await this.upClient.getAllFeatureFlags();
    if (Array.isArray(this.featureFlagList)) {
      this.openSnackBar('GetAllFeatureFlags is executed successfully', 'Ok');
      this.featureFlagList = featureFlags;
    } else {
      this.featureFlagList = [];
    }
  }

  getActiveVariation(flag: any) {
    const { status } = flag;
    const existedVariation = flag.variations.filter(variation => {
      if (variation.defaultVariation && variation.defaultVariation.indexOf(status) !== -1) {
        return variation;
      }
    })[0];
    return  existedVariation ? existedVariation.value : '';
  }
}
