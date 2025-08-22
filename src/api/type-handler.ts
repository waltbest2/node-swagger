import os from 'os';
import fs from 'fs';
import path from 'path';
import { ParamsType, YamlBaseType, YamlInterfaceType } from './yaml-type';
import { controllerInfos, globalVar, REF_PREFIX } from './yaml';
import { filterMultiSlash, firstLowerCase, firstUpperCase } from '../tools';

/**
 * swagger和typescript类型映射
 */
const initData = {
  integer: {
    type: 'number',
    data: 0,
  },
  object: {
    type: 'object', // 不一样
    data: 'Object'
  },
};

/**
 * 处理枚举类型
 * @param type 
 * @param enums 
 * @returns 
 */
function handleEnumType(type: string, enums: string[]): string {
  if (!enums) {
    return type;
  }

  let s = '';
  if (type === 'string') {
    s = "'";
  }

  let typeStr = '';
  enums.forEach(el => {
    typeStr += `${s}${el}${s}|`;
  });
  typeStr = typeStr.replace(/\|$/, '');

  return typeStr;
}

export function dealYamlTypes(propKey: string, element: YamlBaseType, isInterf: boolean): ParamsType {
  if (!element) {
    return {
      name: propKey.indexOf('-') > -1 ? `'${propKey}'` : `${propKey}`,
      type: '',
      optional: '?',
      desc: '',
      objType: '',
      initData: '',
    };
  }

  element.extraType = element.type = element.type || 'any';

  if (element.enum) {
    element.extraType = handleEnumType(element.type, element.enum);
  }

  const obj = initTypeObj(propKey, element, isInterf);

  // 处理数组
  if (element.type === 'array') {
    handleArrayType(element, obj);
  } else if (element.type === 'object' || element.$ref) {
    const refClass = element.$ref ? element.$ref.substring(REF_PREFIX.length) : 'Object';
    if (refClass) {
      obj.type = `: ${refClass === 'Object' ? 'object' : refClass}`;
      obj.objType = `${refClass}`;
      obj.$ref = refClass === 'Object' ? undefined : refClass;
    }
  }

  return obj;
}

function initTypeObj(propKey: string, element: YamlBaseType, isInterf: boolean): ParamsType {
  return {
    name: propKey.indexOf('-') > -1 ? `'${propKey}'` : `${propKey}`,
    // 简单类型有初始化值，不不不给类型，解决eslint问题
    type: element.extraType ? `: ${initData[element.extraType]?.type || element.extraType}` : '',
    optional: isInterf || element.optional || !element.required ? '?' : '',
    desc: element.description ? `/** ${element.description} */` : '',
    objType: element.extraObj,
    initData: '',
  }
}

function handleArrayType(element: any, obj: ParamsType): void {
  if (element.items) {
    if (element.items.type === 'object' || element.items.$ref) {
      const extraObj = element.items.$ref ? element.items.$ref.substring(REF_PREFIX.length) : 'Object';
      obj.type = `: ${extraObj === 'Object' ? 'object' : extraObj}[]`;
      obj.objType = extraObj;
      obj.$ref = extraObj === 'Object' ? undefined : extraObj;
    } else {
      let type = element.items.type;
      type = initData[type]?.type || type;
      const enums = element.items.enum;
      const typeStr = handleEnumType(type, enums);
      obj.type = `: ${enums ? '(' + typeStr + ')' : typeStr}[]`;
    }
  } else {
    obj.type = '';
    obj.initData = '';
  }
}

export function handleSingleType(models, modelName): void {
  const to = path.join(globalVar.targetPath || __dirname, `../extra-model/${modelName}.ts`);
  const { description, type, enum: enumType } = models[modelName];

  let targetType = type;
  if (enumType) {
    let prefix = '';
    if (type === 'string') {
      prefix = '"';
    }
    targetType = enumType.reduce((t, c, idx) => {
      if (idx === 0) {
        return `${prefix}${c}${prefix}`;
      } else {
        return `${t} | ${prefix}${c}${prefix}`;
      }
    }, '');
  }

  let content = `export type ${modelName} = ${targetType};`;

  if (description) {
    content = `// ${description}${os.EOL}${content}`;
  }

  fs.writeFileSync(to, content);
}

/**
 * 根据指定接口找到所有相关的类
 * @param interf 
 * @param objModels 所有definitions
 */
function goThroughByUrl(interf: YamlInterfaceType, objModels: any): any {
  const { reqModel = [], respModel = [] } = interf || {}; // check

  const defModels = {};

  [...reqModel, ...respModel].forEach((model: ParamsType) => {
    // 插件处理每个属性的
    if (model.$ref && !defModels[model.$ref]) {
      defModels[model.$ref] = objModels[model.$ref];
      getChildModel(defModels, model.$ref, objModels);
    }
  });

  return defModels;
}

function getChildModel(defModels: { [key:string]: any}, modelName: string, models: any) {
  if (!modelName) {
    return;
  }

  const elements = models[modelName]?.properties || {};

  // 对象所有的属性
  const totalProps = {};
  Object.assign(totalProps, elements);

  // 合并所有属性
  const allOfObjs = handleModelAllof(models, modelName, totalProps);
  for (const obj of Object.keys(allOfObjs)) {
    defModels[obj] = allOfObjs[obj];
  }

  for (const propKey of Object.keys(totalProps)) {
    const obj: ParamsType = dealYamlTypes(propKey, totalProps[propKey], false);

    if (obj.$ref && !defModels[obj.$ref]) {
      defModels[obj.$ref] = models[obj.$ref];
      getChildModel(defModels, obj.$ref, models);
    }
  }
}

export function handleModelAllof(models, modelName, totalProps): any {
  const allOfObjs = {};
  if (models[modelName]?.allOf) {
    models[modelName].allOf.forEach(element => {
      const objName = element.$ref?.substring(REF_PREFIX.length);
      if (element.$ref && models[objName]) {
        Object.assign(totalProps, models[objName].properties);
        allOfObjs[objName] = models[objName];
      } else if (element.type === 'object') {
        const subElements = element.properties;
        Object.assign(totalProps, subElements);
      }
    });
  }

  return allOfObjs;
}

export function handleObj(renderReqModel: (interf: YamlInterfaceType) => void, renderRespModel: (interf: YamlInterfaceType) => void, objModels: any): any {
  let defModels = {};
  const { yamlObj } = globalVar;
  if (!yamlObj.paths) {
    return defModels;
  }

  for (const url of Object.keys(yamlObj.paths)) {
    if (globalVar.targetIF?.endsWith('*') && !url.startsWith(globalVar.targetIF.slice(0, -1))) {
      continue;
    } else if (globalVar.targetIF && globalVar.targetIF !== `${url}`) {
      continue;
    }

    const interfaces = yamlObj.paths[url];
    for (const method of Object.keys(interfaces)) {
      if (globalVar.targetMethod && globalVar.targetMethod !== method) {
        continue;
      }

      const interf: YamlInterfaceType = interfaces[method];

      const controllerName = firstUpperCase(`${interf.tags[0]}`);
      globalVar.routerStr += `     router.${method}('${filterMultiSlash(url)}', controller.${firstLowerCase(controllerName)}.${interf.operationId});\r\n`;

      // 处理请求参数
      renderReqModel(interf);

      // 处理响应
      renderRespModel(interf);

      // 遍历处理该接口依赖的所有自定义类
      defModels = { ...defModels, ...goThroughByUrl(interf, objModels)};

      // 构造controller参数
      controllerInfos[`${controllerName}`] = controllerInfos[`${controllerName}`] || [];

      const obj = {
        function: `${interf.operationId}`,
        check: JSON.stringify(interf.check) || '{}',
        reqModel: interf.reqModel ? {
          model: interf.reqModel,
          modelName: `${firstUpperCase(interf.operationId)}RequestBody`,
        } : null,
        respModel: interf.respModel ? {
          modelName: `${firstUpperCase(interf.operationId)}ResponseBody`,
          extraModelName: `: ${firstUpperCase(interf.operationId)}ResponseBody`,
        } : '',
      };
      controllerInfos[`${controllerName}`].push(obj);
    }
  }

  return defModels;
}