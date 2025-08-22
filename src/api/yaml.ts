import YAML from 'yaml';
import path from 'path';
import fs from 'fs';
import { ParamsType, YamlInterfaceType, YamlType } from "./yaml-type";
import { convertSnakeToLowerCamel, filterMultiSlash, firstLowerCase, firstUpperCase } from '../tools';
import { dealYamlTypes, handleModelAllof, handleObj, handleSingleType } from './type-handler';
import { dealCheck, dealConditionCheck } from './type-checker';

const templatePath = path.join(__dirname, '../../template');
export const REF_PREFIX = '#/definitions/';

export const controllerInfos = {};

export const globalVar: {
  routerStr: string;
  targetPath: string;
  yamlObj: YamlType;
  targetIF: string; // 指定导出url
  targetMethod: string; // 指定导出method
} = {
  routerStr: '',
  targetPath: '',
  targetIF: '',
  targetMethod: '',
  yamlObj: {
    basePath: '',
    paths: {},
    definitions: {},
  }
};

export function parseFromFile(yamlFilePath: string): any {
  if (!fs.existsSync(yamlFilePath)) {
    console.warn('[node-swagger] yaml file not exist');
    return null;
  }

  const yamlStr: string = fs.readFileSync(yamlFilePath, {encoding: 'utf8'}).toString();

  let yamlObj: any;
  try {
    yamlObj = YAML.parse(yamlStr);
  } catch (e) {
    console.error('[node-swagger] yaml file format is wrong', e.message, e.source);
    return undefined;
  }

  // 合并完整的url
  if (yamlObj.basePath && yamlObj.basePath !== '/') {
    for (const rPath of Object.keys(yamlObj.paths)) {
      const fullPath = filterMultiSlash(`${yamlObj.basePath}${rPath}`);
      yamlObj.paths[fullPath] = yamlObj.paths[rPath];
      delete yamlObj.paths[rPath];
    }
  }

  return yamlObj;
}

/**
 * 如果target（也就是obj1[key]）存在，且是对象的话再去调用deepMerge，否则就是obj1[key]里面没有这个对象，需要与obj2[key]合并
 * 
 * 如果obj2[key]没有值或者值不是对象，此时直接替换obj1[key]
 * @param obj1 
 * @param obj2 
 * @returns 
 */
function deepMerge(obj1, obj2): any {
  for (const key in obj2) {
    if (obj1[key]?.toString() === '[object Object]' && obj2[key]?.toString() === '[object Object]') {
      obj1[key] = deepMerge(obj1[key], obj2[key]);
    } else {
      obj1[key] = obj2[key];
    }
  }

  return obj1;
}

/**
 * 将所有yaml合并为一个对象，便于统一处理
 * @param folder 
 * @param initObj 
 * @returns 
 */
export function getAllYamlObjs(folder: string, initObj: any): any {
  const files = fs.readdirSync(folder);
  let sourceObj = initObj;
  for (const f of files) {
    const filePath = path.join(folder, f);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      sourceObj = getAllYamlObjs(filePath, sourceObj);
    } else {
      const yamlObj = parseFromFile(filePath);
      if (yamlObj) {
        sourceObj = deepMerge(sourceObj, yamlObj);
      }
    }
  }

  return sourceObj;
}

/**
 * 支持文件夹下所有yaml文件导入
 * @param folder 
 * @param tgtPath 
 */
export function batchGenCodeFromYaml(folder: string, tgtPath: string): void {
  const batchYamlObjs = getAllYamlObjs(folder, {});
  generateCodeFromYaml(batchYamlObjs, tgtPath);
}

/**
 * 生成eggjs需要的文件，除了Model，还有controller, service, route, delegate文件
 * @param yamlFile 
 * @param tgtPath 
 */
export function generateCodeFromYaml(yamlFile: any, tgtPath: string): void {
  generateCodeFromYaml(yamlFile, tgtPath);

  // 渲染controller文件
  renderController(controllerInfos);

  // 渲染service依赖的delegate接口
  renderDelegate(controllerInfos);

  // 第一次渲染service文件
  renderService(controllerInfos);

  // 渲染route文件
  renderRouter(globalVar.routerStr);
}

/**
 * 只生成API涉及Model文件
 * @param yamlFile yaml文件的完整路径或者对象
 * @param targetPath 生成代码的目录
 * @returns 
 */
export function generateModelFromYaml(yamlFile: any, targetPath: string): void {
  if (typeof yamlFile === 'string') {
    globalVar.yamlObj = parseFromFile(yamlFile);
  } else {
    globalVar.yamlObj = yamlFile;
  }

  if (!globalVar.yamlObj) {
    console.warn('[node-swagger] yaml is empty');
    return;
  }

  globalVar.targetPath = targetPath;

  // 初始化中间变量对象
  const objModels = init();

  // 渲染请求和响应model
  const defModels = handleObj(renderReqModel, renderRespModel, objModels);
  if (defModels) {
    renderObjectModel(defModels);
  }
}

function init(): any {
  const { yamlObj } = globalVar;

  // 清理controller
  const cKeys = Object.keys(controllerInfos);
  for (const key of cKeys) {
    delete controllerInfos[key];
  }

  const objModels = {};
  if (!yamlObj.definitions) {
    return objModels;
  }

  for (const name of Object.keys(yamlObj.definitions)) {
    const element = yamlObj.definitions[name];
    objModels[name] = element;
  }

  return objModels;
}

function handleModelRequre(elements, requiredKeys): void {
  if (elements && requiredKeys) {
    for (const v of requiredKeys) {
      if (elements[v]) {
        elements[v].required = true;
      }
    }
  }
}

/**
 * 处理definitions中的所有model
 * @param models 
 */
function renderObjectModel(models: any): void {
  if (!models) {
    return;
  }

  for (const modelName of Object.keys(models)) {
    if (!models[modelName]) {
      continue;
    }

    // 对象所有的属性
    const totalProps = {};
    const props: ParamsType[] = [];
    const elements = models[modelName].properties;
    const requiredKeys = models[modelName].required;
    handleModelRequre(elements, requiredKeys);
    if (elements) {
      Object.assign(totalProps, elements);
    } else if (!models[modelName].allOf) {
      // 处理单类型
      handleSingleType(models, modelName);
      continue;
    }

    // 合并所有属性
    handleModelAllof(models, modelName, totalProps);

    for (const propKey of Object.keys(totalProps)) {
      const obj: ParamsType = dealYamlTypes(propKey, totalProps[propKey], false);
      const check = {};
      const type = 'definitions';
      dealConditionCheck(totalProps[propKey], check, type, propKey);
      obj.check = check[type]?.[propKey];
      props.push(obj);
    }
    renderModel(modelName, props, true);
  }
}

/**
 * 导出class或interface类型的model
 * @param modelName 
 * @param props 
 * @param isInterf 
 */
function renderModel(modelName: string, props: ParamsType[], isInterf?: boolean): void {
  const { targetPath } = globalVar;

  const from = path.join(templatePath, isInterf ? 'Interface.template' : 'Model.template');

  for (const prop of props) {
    const { name } = prop;
    const rename = convertSnakeToLowerCamel(name);
    if (rename !== name) {
      prop.rename = name;
      prop.name = rename;
    }
  }

  const data = {
    ModelName: modelName,
    props,
    isInterf,
  };

  const to = path.join(targetPath || __dirname, '../extra-model/');
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to);
  }

  fs.copyTpl(from, to, data, {
    rename() {
      return `${modelName}.ts`;
    }
  });
}

/**
 * 处理请求model
 * @param interf 
 */
function renderReqModel(interf: YamlInterfaceType): void {
  if (!interf?.parameters) {
    return;
  }

  // 处理请求参数
  const key = `${firstUpperCase(interf.operationId)}RequestBody`;
  const props: ParamsType[] = [];
  const check = {};
  interf.parameters.forEach(param => {
    const obj: ParamsType = dealYamlTypes(param.name, param.schema || param, false);
    obj.in = param.in;
    dealCheck(check, param.in, param.name, param);

    //记录check项
    obj.check = check?.[param.in]?.[param.name];
    props.push(obj);
  });

  interf.reqModel = props;
  interf.check = check;
  renderModel(key, props);
}

/**
 * 处理响应model
 * @param interf 
 */
function renderRespModel(interf: YamlInterfaceType): void {
  if (!interf.responses) {
    return;
  }

  // 处理响应值
  const key = `${firstUpperCase(interf.operationId)}ResponseBody`;
  const props: ParamsType[] = [
    {
      name: 'rspHeaders',
      type: ': object',
      optional: '?',
      desc: '/** customise response headers */',
      objType: '',
      initData: '',
    },
  ];

  const statusArr = [];
  for (const status of Object.keys(interf.responses)) {
    const element = interf.responses[status];
    statusArr.push(status);
    const obj = dealYamlTypes(`rsp${status}`, element.schema || element, true);
    props.push(obj);
  }

  if (statusArr.length > 0) {
    props.push({
      name: 'status',
      type: `: ${statusArr.join('|')} `,
      optional: '',
      desc: '',
      objType: '',
      initData: '',
    });
  }

  interf.respModel = props;
  renderModel(key, props, true);
}

/**
 * 渲染controller文件
 * @param controllerInfos 
 */
function renderController(ctrlInfos: any): void {
  if (!ctrlInfos) {
    return;
  }

  const from = path.join(templatePath, 'Controller.template');
  for (const controllerName of Object.keys(ctrlInfos)) {
    const element = ctrlInfos[controllerName];
    const data = {
      interfaces: element,
      ControllerName: controllerName,
      ServiceName: firstLowerCase(controllerName),
    };

    const to = path.join(globalVar.targetPath || __dirname, './');
    if (!fs.existsSync(to)) {
      fs.mkdirSync(to);
    }

    fs.copyTpl(from, to, data, {
      rename() {
        return `${controllerName}.ts`;
      }
    });
  }
}

/**
 * 如果service不存在，则渲染service文件
 * @param serviceInfos 
 */
function renderService(serviceInfos: any): void {
  if (!serviceInfos) {
    return;
  }

  const from = path.join(templatePath, 'Service.template');
  const to = path.join(globalVar.targetPath || __dirname, '../service/');
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to);
  }

  for (const controllerName of Object.keys(controllerInfos)) {
    if (fs.existsSync(path.join(to, `${controllerName}.ts`))) {
      continue;
    }

    const element = controllerInfos[controllerName];
    const data = {
      interfaces: element,
      ControllerName: controllerName,
      ServiceName: firstLowerCase(controllerName),
    };

    fs.copyTpl(from, to, data, {
      rename() {
        return `${controllerName}.ts`;
      }
    });
  }
}

/**
 * 渲染service实现的interface delegate文件，对标java
 * @param delegateInfos 
 */
function renderDelegate(delegateInfos: any): void {
  if (!delegateInfos) {
    return;
  }

  const from = path.join(templatePath, 'Delegate.template');
  const to = path.join(globalVar.targetPath || __dirname, '../delegate/');
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to);
  }

  for (const controllerName of Object.keys(controllerInfos)) {
    if (fs.existsSync(path.join(to, `${controllerName}.ts`))) {
      continue;
    }

    const element = controllerInfos[controllerName];
    const data = {
      interfaces: element,
      ControllerName: controllerName,
      ServiceName: firstLowerCase(controllerName),
    };

    fs.copyTpl(from, to, data, {
      rename() {
        return `${controllerName}Delegate.ts`;
      }
    });
  }
}

/**
 * 渲染route文件
 * @param routerStr 
 */
function renderRouter(routerStr: any): void {
  if (!routerStr) {
    return;
  }

  const from = path.join(globalVar.targetPath || __dirname, '../');
  const data = {
    routerStr,
  }
  const to = path.join(from, './router.ts/');
  if (fs.existsSync(path.join(from, './router.tstemplate'))) {
    fs.copyTpl(path.join(from, '.router.tstemplate'), to, data, {});
  } else {
    // 构造模板替换字符串
    const routeFile = path.join(from, './router.ts');
    let objStr = fs.readFileSync(routeFile).toString();
    objStr = objStr.replace(/\/\*\s*start_yaml\s*\*\/[\s\S]*\/\*\s*end_yaml\s*\*\//, '/* start_yaml */\r\n<%-routerStr%>   /* end_yaml */');
    fs.writeFileSync(routeFile, objStr);
    fs.copyTpl(routeFile, to, data, {});
  }
}