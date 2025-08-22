import { ValiType, CheckItem } from './validator'

/**
 * 指定当前属性key的原始名
 * @param name api 原始名字
 * @returns 
 */
export function rename(name: string): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    if (!name || !propertyKey) {
      return;
    }

    if (!target.$keyPair) {
      Object.defineProperty(target, '$keyPair', {
        value: {},
      });
    }

    if (!target.$reKeyPair) {
      Object.defineProperty(target, '$reKeyPair', {
        value: {},
      });
    }

    const { $keyPair, $reKeyPair } = target;
    $keyPair[propertyKey] = name;
    $reKeyPair[name] = propertyKey;
  };
}

/**
 * 指定当前属性的class
 * @param className 
 * @returns 
 */
export function useClass(className: any): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    if (!className || !propertyKey) {
      return;
    }

    if (!target.$targetClass) {
      Object.defineProperty(target, '$targetClass', {
        value: {},
      });
    }
    const { $targetClass } = target;
    $targetClass[propertyKey] = className;
  };
}

/**
 * 指定当前属性名的in type
 * @param type 类型 header qurey body
 * @returns 
 */
export function inType(type: string): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    if (!type || !propertyKey) {
      return;
    }

    if (!target.$inType) {
      Object.defineProperty(target, '$inType', {
        value: {},
      });
    }
    const { $inType } = target;
    $inType[propertyKey] = type;
  };
}

/**
 * 字段转换
 * @param fn 转换函数， 参数fn(root, parent). root: API的根对象， parent: API上一层对象
 * 
 * 如果传递的是箭头函数，this对应内部的parent对象，重要：慎用内部对象，因为属性不一定都赋值好
 * 
 * 如果传递的时普通函数， this === parent
 * @returns 
 */
export function convertFn(fn: Function): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    if (!fn || !propertyKey || typeof fn !== 'function') {
      return;
    }

    if (!target.$convertFn) {
      Object.defineProperty(target, '$convertFn', {
        value: {},
      });
    }
    const { $convertFn } = target;
    $convertFn[propertyKey] = fn;
  };
}

/**
 * 指定当前属性名的原始值
 * @param checkItem 校验项或自定义校验function
 * @returns 
 */
export function check(checkItem: CheckItem | ((params) => ValiType)): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    if (!checkItem || !propertyKey) {
      return;
    }

    if (!target.$__checkItem) {
      Object.defineProperty(target, '$__checkItem', {
        value: {},
      });
    }
    const { $__checkItem } = target;
    $__checkItem[propertyKey] = checkItem;
  };
}

// 定义全局自定义回调
check.callback = <({ property, params, itemKey }: { property?: string; params?: any; itemKey?: string}) => any>undefined;