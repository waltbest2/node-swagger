import apiSystemPlugin from "../plugin";
import { globalVar, REF_PREFIX } from './yaml';

/**
 * 构造请求的参数校验数据结构
 * @param checkModel 
 * @param type 
 * @param tname 
 * @param param 
 * @returns 
 */
export function dealCheck(checkModel: any, type: string, tname: string, param: any): void {
  let name = tname;
  if (!param) {
    console.warn('[node-swagger] null param', type, name);
    return;
  }

  // get url参数数组处理
  if (type === 'query' && param.type === 'array') {
    Object.assign(param, param.items);
    name = `${name}[]`;
  } else if (param.in === 'query') { // 处理body直接属性
    name = '$body$';
  }

  // 开始原子处理
  dealConditionCheck(param, checkModel, type, name);

  const { yamlObj } = globalVar;

  // 请求body
  if (param.schema && param.schema.$ref) {
    dealCheck(checkModel, type, '', yamlObj.definitions?.[param.schema.$ref.substring(REF_PREFIX.length)]);
  } else if (param.allOf) { // definitions中的合并处理
    param.allOf.forEach(element => {
      if (element.$ref) {
        dealCheck(checkModel, type, name, yamlObj.definitions?.[element.$ref.substring(REF_PREFIX.length)]);
      } else {
        dealCheck(checkModel, type, name, element);
      }
    });
  } else if (param.properties) { // definitions中的一般处理
    handlePropertiesCheck(param, checkModel, type, name);
  }

}

/**
 * 检查有没有循环引用，如果本对象出现在父级的依赖路径中，则不允许在遍历处理
 * @param parent 父级所有依赖
 * @param self 
 * @returns 
 */
function setParentPath(parent, self) {
  parent.refDeps = parent.refDeps || [];
  if (self && !parent.refDeps.includes(self)) {
    self.refDeps = self.refDeps || [];
    self.refDeps = self.refDeps.concat(parent.refDeps);
    self.refDeps.push(self);
    return true;
  }

  return false;
}

function handlePropertiesCheck(param: any, checkModel: any, type: string, name: string): void {
  const requireList = param.required || [];
  const { yamlObj } = globalVar;

  Object.keys(param.properties).forEach(key => {
    const element = param.properties[key];
    if (requireList.includes(key)) {
      element.required = true;
    }

    // 引用外部对象
    if (element.$ref) {
      const elementObj = yamlObj.definitions?.[element.$ref.substring(REF_PREFIX.length)];
      if (setParentPath(param, elementObj)) {
        dealCheck(checkModel, type, name ? `${name}.${key}` : key, elementObj);
      }
    } else if (element.type === 'array' && element.items) {
      checkPropertyArray({ element, checkModel, type, name, key, parent: param});
    } else {
      // 引用外部简单类型
      dealCheck(checkModel, type, name ? `${name}.${key}` : key, element);
    }
  })
}

function checkPropertyArray({
  element, checkModel, type, name, key, parent,
}: {
  element: any;
  checkModel: any;
  type: string;
  name: string;
  key: string;
  parent: any;
}): void {
  if (element.items.$ref) {
    // 数组本身做一次校验，主要是maxItems和minItems
    dealCheck(checkModel, type, name ? `${name}.${key}[]` : `${key}[]`, element);
    const { yamlObj } = globalVar;
    const elementObj = yamlObj.definitions?.[element.items.$ref.substring(REF_PREFIX.length)];
    if (setParentPath(parent, elementObj)) {
      // 深入对象检查
      dealCheck(checkModel, type, name ? `${name}.${key}[]` : `${key}[]`, elementObj);
    }
  } else {
    // 引用外部简单数组
    // 简单类型，将类型和数组校验规则合并
    dealCheck(checkModel, type, name ? `${name}.${key}[]` : `${key}[]`, Object.assign({}, element, element.items));
  }
}

export function dealConditionCheck(param: any, checkModel: any, type: string, name: string): void {
  apiSystemPlugin.lifeCycle.compile.emit({
    param,
    checkModel,
    type,
    name,
  })
}