import { ParseMeta, Parser } from '../../stage/parse';

export class BasicParser extends Parser {
  conditionList = [
    (meta: ParseMeta): void => {
      const { param, checkModel, type, name } = meta;
      if (param.required === true) {
        this.initModelType(checkModel, type, name);
        checkModel[type][name].required = true;
      }
    },
    (meta: ParseMeta): void => {
      const { param, checkModel, type, name } = meta;
      if (param['x-maxLength'] !== undefined) {
        this.initModelType(checkModel, type, name);
        checkModel[type][name]['x-maxLength'] = param['x-maxLength'];
      }
    },
    (meta: ParseMeta): void => {
      const { param, checkModel, type, name } = meta;
      if (param['x-minLength'] !== undefined) {
        this.initModelType(checkModel, type, name);
        checkModel[type][name]['x-minLength'] = param['x-minLength'];
      }
    },
    (meta: ParseMeta): void => {
      const { param, checkModel, type, name } = meta;
      if (param.minLength !== undefined) {
        this.initModelType(checkModel, type, name);
        checkModel[type][name].minLength = param.minLength;
      }
    },
    (meta: ParseMeta): void => {
      const { param, checkModel, type, name } = meta;
      if (param.maxLength !== undefined) {
        this.initModelType(checkModel, type, name);
        checkModel[type][name].maxLength = param.maxLength;
      }
    },
    (meta: ParseMeta): void => {
      const { param, checkModel, type, name } = meta;
      if (param.maximum !== undefined) {
        this.initModelType(checkModel, type, name);
        checkModel[type][name].maximum = param.maximum;
      }
    },
    (meta: ParseMeta): void => {
      const { param, checkModel, type, name } = meta;
      if (param.minimum !== undefined) {
        this.initModelType(checkModel, type, name);
        checkModel[type][name].minimum = param.minimum;
      }
    },
    (meta: ParseMeta): void => {
      const { param, checkModel, type, name } = meta;
      if (param.maxItems !== undefined) {
        this.initModelType(checkModel, type, name);
        checkModel[type][name].maxItems = param.maxItems;
      }
    },
    (meta: ParseMeta): void => {
      const { param, checkModel, type, name } = meta;
      if (param.minItems !== undefined) {
        this.initModelType(checkModel, type, name);
        checkModel[type][name].minItems = param.minItems;
      }
    },
    (meta: ParseMeta): void => {
      const { param, checkModel, type, name } = meta;
      if (param.pattern !== undefined) {
        this.initModelType(checkModel, type, name);
        checkModel[type][name].pattern = param.pattern;
      }
    },
    (meta: ParseMeta): void => {
      const { param, checkModel, type, name } = meta;
      if (param.enum !== undefined) {
        this.initModelType(checkModel, type, name);
        checkModel[type][name].enum = param.enum;
      }
    },
  ];

  private initModelType(checkModel: any, type: string, name: string): void {
    checkModel[type] = checkModel[type] || {};
    checkModel[type][name] = checkModel[type][name] || {};
  }

  public compile(meta: ParseMeta): void {
    this.linkCompile(meta);
  }
}