import { AbstractControl } from '@angular/forms';
import { GroupTypes } from '../core/app.model';

export class FormValidators {
  static validatePreviewUserGroupForm(controls: AbstractControl): { [key: string]: any } | null {
    const groupValue = controls.get('groupType').value;
    const customGroupValue = controls.get('customGroupName').value;
    if (groupValue === GroupTypes.OTHER) {
      return !!customGroupValue ? null : { customGroupNameError: true };
    }
    return null;
  }

  static validatePreviewUserForm(controls: AbstractControl): { [key: string]: any } | null {
    const userGroups = controls.get('userGroups').value;
    if (userGroups.length) {
      const otherGroupTypeList = userGroups.filter(group => group.groupType === GroupTypes.OTHER);
      if (otherGroupTypeList.length) {
        const set = new Set();
        otherGroupTypeList.forEach(group => {
          set.add(group.customGroupName);
        });
        return set.size === otherGroupTypeList.length ? null : { customGroupNameError: true }
      }
    }
    return null;
  }
}
