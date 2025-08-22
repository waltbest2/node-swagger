export type ValiType = false | undefined;

export interface ValiMeta {
  rule: any;
  data: any;
}

export enum CheckKey {
  required = 'required',
  maxLength = 'maxLength',
  minLength = 'minLength',
  pattern = 'pattern',
  'x-maxLength' = 'x-maxLength',
  'x-minLength' = 'x-minLength',
  maximum = 'maximum',
  minimum = 'minimum',
  enum = 'enum',
  maxItems = 'maxItems',
  minItems = 'minItems',
}

export type CheckItem = { [type in CheckKey]: boolean | number | string | number[] | string[] };

export const conditionList = [
  (meta: ValiMeta): ValiType => {
    const { rule, data } = meta;
    if (rule.required && !data) {
      return false;
    }
    return undefined;
  },
  (meta: ValiMeta): ValiType => {
    const { rule, data } = meta;
    if (rule.maxLength !== undefined && data?.length > rule.maxLength) {
      return false;
    }
    return undefined;
  },
  (meta: ValiMeta): ValiType => {
    const { rule, data } = meta;
    if (rule.minLength !== undefined && data?.length < rule.minLength) {
      return false;
    }
    return undefined;
  },
  (meta: ValiMeta): ValiType => {
    const { rule, data } = meta;
    if (rule['x-maxLength'] !== undefined && data?.length > rule['x-maxLength']) {
      return false;
    }
    return undefined;
  },
  (meta: ValiMeta): ValiType => {
    const { rule, data } = meta;
    if (rule['x-minLength'] !== undefined && data?.length < rule['x-minLength']) {
      return false;
    }
    return undefined;
  },
  (meta: ValiMeta): ValiType => {
    const { rule, data } = meta;
    if (rule.maximum !== undefined && Number.parseFloat(data) > rule.maximum) {
      return false;
    }
    return undefined;
  },
  (meta: ValiMeta): ValiType => {
    const { rule, data } = meta;
    if (rule.minimum !== undefined && Number.parseFloat(data) < rule.minimum) {
      return false;
    }
    return undefined;
  },
  (meta: ValiMeta): ValiType => {
    const { rule, data } = meta;
    if (rule.pattern !== undefined && !new RegExp(rule.pattern).test(data)) {
      return false;
    }
    return undefined;
  },
  (meta: ValiMeta): ValiType => {
    const { rule, data } = meta;
    if (rule.enum !== undefined && !rule.enum.includes(data)) {
      return false;
    }
    return undefined;
  },

];

export function checkItems(meta: ValiMeta): ValiType {
  for (const condition of conditionList) {
    const result = condition(meta);
    if (result !== undefined) {
      return result;
    }
  }
  return undefined;
}