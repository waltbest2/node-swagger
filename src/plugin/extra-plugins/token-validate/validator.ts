import { checkTokenExpire } from '../../../tools';
import { Validator, ValiType, ValiMeta } from '../../stage/validate';

export class TokenValidator extends Validator {
  private readonly ERROR_CODE_UNAUTH = '401';
  private readonly TOKEN_HEADER = 'x-auth-token';

  private checkNullVal(val): boolean {
    return !val && val !== 0 && val !== false;
  }

  public check(meta: ValiMeta): ValiType {
    const { rule, key, data } = meta;
    let result;
    if (rule.required === true && !this.checkNullVal(data) && key === this.TOKEN_HEADER) {
      result = checkTokenExpire(data, this.ERROR_CODE_UNAUTH);
    }

    return result;
  }
}