export interface YamlType {
  basePath: string;
  definitions: object;
  paths: object;
}

/**
 * 对象
 */
export interface ParamsType {
  /**
   * 参数名，yaml定义的原始名
   */
  name: string;

  /**
   * 对象类名，添加了:, 用于渲染
   */
  type: string;

  /**
   * 是否可以选， required = false
   */
  optional: string;

  /**
   * 参数描述
   */
  desc: string;

  /**
   * 对象类名，原始
   */
  objType: string;

  /**
   * 初始值，例如 name = 'walt'
   */
  initData: string;

  /**
   * 是否输入
   */
  in?: string;

  /**
   * 命名转换后的命名，例如将蛇形转成小驼峰后的命名
   */
  rename?: string;

  /**
   * 是否是指定类名（也就是definitions中定义的）
   * 
   * undefined 表示否，否则就是 有
   */
  $ref?: string;

  /**
   * 该属性的check项
   */
  check?: {
    [checkType: string]: string | number | boolean;
  }
}

/**
 * Yaml定义的原始类型
 */
export interface YamlBaseType {
  /**
   * 类型
   */
  type: string;

  /**
   * 描述
   */
  description: string;

  /**
   * 可以渲染的TS类型
   */
  extraType: string;

  /**
   * 枚举值类型
   */
  enum: string[];

  /**
   * 自定义类型索引
   */
  $ref: string;

  /**
   * 是否必选
   */
  required: boolean;

  /**
   * 是否可选，true when required === false;
   */
  optional: boolean;

  /**
   * 对象类名， 原始
   */
  extraObj: string;
}

/**
 * Yaml中接口对象类型
 */
export interface YamlInterfaceType {

  /**
   * 请求参数级
   */
  parameters: any;

  /**
   * 响应对象集
   */
  responses: any;

  /**
   * 接口对应方法名
   */
  operationId: string;

  /**
   * 请求对象集，解析后补充添加的
   */
  reqModel: ParamsType[];

  /**
   * 响应对象集，解析后补充添加的
   */
  respModel: ParamsType[];

  /**
   * 校验
   */
  check: {
    [type: string]: {
      [name: string]: any;
    };
  };

  /**
   * 接口对应的类名
   */
  tags: string[];
}