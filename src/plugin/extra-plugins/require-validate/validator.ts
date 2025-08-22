import { Validator, ValiType, ValiMeta } from '../../stage/validate';

export class RequireValidator extends Validator {
  private checkNullVal(val): boolean {
    return !val && val !== 0 && val !== false && val !== '';
  }

  public check(meta: ValiMeta): ValiType {
    const { rule, data } = meta;
    if (rule.required && this.checkNullVal(data)) {
      return false;
    }

    return undefined;
  }
}