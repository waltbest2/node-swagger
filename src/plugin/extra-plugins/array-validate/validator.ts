import { Validator, ValiType, ValiMeta } from '../../stage/validate';

export class ArrayValidator extends Validator {
  constructor() {
    super();
    this.conditionList = [
      (meta: ValiMeta): ValiType => {
        const { data, rule } = meta;
        if (rule.maxItems !== undefined && data?.length > rule.maxItems) {
          return false;
        }
        return undefined;
      },
      (meta: ValiMeta): ValiType => {
        const { data, rule } = meta;
        if (rule.minItems !== undefined && data?.length < rule.minItems) {
          return false;
        }

        return undefined;
      },
      (meta: ValiMeta): ValiType => {
        const { data, rule, ruleCheck } = meta;
        for (let i = 0; i < data?.length; i++) {
          if (!ruleCheck(data[i], rule)) {
            return false;
          }
        }
        return undefined;
      },
    ];
  }

  public check(meta: ValiMeta): ValiType {
    const { data } = meta;
    if (Array.isArray(data)) {
      return this.linkCheck(meta);
    }

    return undefined;
  }
}