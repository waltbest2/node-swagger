export interface ParseMeta {
  /**
   * 原始值
   */
  param: any;

  /**
   * 校验类型 m[in_type][property_name][check_type]
   */
  checkModel: any;

  /**
   * in_type
   */
  type: string;

  /**
   * property_name
   */
  name: string;
}

export abstract class Parser {
  protected conditionList: ((meta: ParseMeta) => void)[];

  public linkCompile(meta: ParseMeta): void {
    for (const condition of this.conditionList) {
      const result = condition(meta);
      if (result !== undefined) {
        return result;
      }
    }

    return undefined;
  }

  /**
   * Parser核心方法
   * @param meta 
   */
  public abstract compile(meta: ParseMeta);
}