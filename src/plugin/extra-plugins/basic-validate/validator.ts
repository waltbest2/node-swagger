import { Validator, ValiMeta, ValiType } from '../../stage/validate';

export class BasicValidator extends Validator {
  conditionList = [
    (meta: ValiMeta): ValiType => {
      const { data } = meta;
      if (!data) {
        return true;
      }

      return undefined;
    },
    (meta: ValiMeta): ValiType => {
      const { data, rule } = meta;
      if (rule.maxLength !== undefined && data?.length > rule.maxLength) {
        return false;
      }

      return undefined;
    },
    (meta: ValiMeta): ValiType => {
      const { data, rule } = meta;
      if (rule.minLength !== undefined && data?.length < rule.minLength) {
        return false;
      }

      return undefined;
    },
    (meta: ValiMeta): ValiType => {
      const { data, rule } = meta;
      if (rule['x-maxLength'] !== undefined && data?.length > rule['x-maxLength']) {
        return false;
      }

      return undefined;
    },
    (meta: ValiMeta): ValiType => {
      const { data, rule } = meta;
      if (rule['x-minLength'] !== undefined && data?.length < rule['x-minLength']) {
        return false;
      }

      return undefined;
    },
    (meta: ValiMeta): ValiType => {
      const { data, rule } = meta;
      if (rule.maximum !== undefined && Number.parseFloat(data) > rule.maximum) {
        return false;
      }

      return undefined;
    },
    (meta: ValiMeta): ValiType => {
      const { data, rule } = meta;
      if (rule.minimum !== undefined && Number.parseFloat(data) < rule.minimum) {
        return false;
      }

      return undefined;
    },
    (meta: ValiMeta): ValiType => {
      const { data, rule } = meta;
      if (rule.pattern !== undefined && !new RegExp(rule.pattern).test(data)) {
        return false;
      }

      return undefined;
    },
    (meta: ValiMeta): ValiType => {
      const { data, rule } = meta;
      if (rule.enum !== undefined && !rule.enum.includes(data)) {
        return false;
      }

      return undefined;
    },
  ];

  public check(meta: ValiMeta): ValiType {
    return this.linkCheck(meta);
  }
}