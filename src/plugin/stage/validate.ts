/**
 * 中间流程校验通过返回undefined，最终返回true表示通过
 */
export type ValiType = boolean | undefined | '401';

export interface ValiMeta {
  rule: any;
  data: any;
  key: string;
  ruleCheck: (data: any, rule: any) => ValiType;
}

export abstract class Validator {
  protected conditionList: ((meta: ValiMeta) => ValiType)[];

  public linkCheck(meta: ValiMeta): ValiType {
    for (const condition of this.conditionList) {
      const result = condition(meta);
      if (result !== undefined) {
        return result;
      }
    }

    return undefined;
  }

  /**
     * Validator核心方法
     * @param meta 
     */
    public abstract check(meta: ValiMeta): ValiType;
}