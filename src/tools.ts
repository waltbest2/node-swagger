import { check } from "./decorator";
import apiSystemPlugin from "./plugin";
import { ValiType } from "./plugin/stage/validate";
import { checkItems, ValiMeta } from "./validator";

export function isRealObject(obj: any): boolean {
  return obj !== null && typeof obj === 'object';
}

/**
 * check不满足时的处理，支持自定义全局回调
 * @param property 接口字段key
 * @param params 接口值
 * @param itemKey 
 */
function customCheckCallback(property, params, itemKey?) {
  if (check.callback) {
    check.callback({ property, params, itemKey });
  }

  if (itemKey) {
    console.warn('[node-swagger] check failed', property, 'check item', itemKey);
  } else {
    console.warn('[node-swagger] check failed', property);
  }
}

/**
 * 校验请求参数
 * @param targetKey 接口字段key
 * @param params 接口值
 * @param checkItem 该接口字段校验规则
 * @returns true 校验通过，false 校验不通过
 */
export function checkRequestParams(targetKey, params, checkItem: (params) => ValiType): boolean {
  if (typeof checkItem === 'function') {
    // 处理自定义check
    if (checkItem(params) === false) {
      customCheckCallback(targetKey, params);
    }
  } else {
    const checkItemKeys = Object.keys(checkItem);
    checkItemKeys.forEach((itemKey) => {
      const item: ValiMeta = {
        rule: {
          [itemKey]: checkItem[itemKey],
        },
        data: params,
      };
      if (checkItems(item) === false) {
        customCheckCallback(targetKey, params, itemKey);
      }
    });
  }
  return true;
}

/**
 * 将对象转成API对象
 * @param orig 需要转换的对象
 * @param $class 需要转换的对象
 * @returns 
 */
export function convertObjectToApi(orig: any, $class?: any): any {
  if (Array.isArray(orig)) {
    const t = [];
    for (const val of orig) {
      t.push(convertObjectToApi(val, $class));
    }

    return t;
  } else if (isRealObject(orig)) {
    let obj;
    let $targetClass;
    if ($class) {
      obj = new $class();
      $targetClass = obj.$targetClass;
    }
    const $keyPair = orig.$keyPair || obj?.$keyPair;

    // 校验
    const $__checkItem = orig.$__checkItem || obj?.$__checkItem;

    const cloneObj: any = {};
    for ( const key of Object.keys(orig) ) {
      const targetKey = $keyPair?.[key] || key; // key是属性key，targetKey是rename值或属性key
      if(isRealObject(orig[key])) {
        cloneObj[targetKey] = convertObjectToApi(orig[key], $targetClass?.[key]);
      } else {
        if ($__checkItem?.[key]) {
          checkRequestParams(targetKey, orig[key], $__checkItem?.[key]);
        }
        cloneObj[targetKey] = orig[key];
      }
    }
    return cloneObj;
  } else {
    return orig;
  }
}

/**
 * 将API的对象转换成内部对象
 * @param jsonObj 接口传入的对象
 * @param $class 需要转换的对象
 * @param root API的根对象，初始传递不用传，就是jsonObj
 * @returns 
 */
export function convertApiToObject(jsonObj: any, $class?: any, root?: any): any {
  if (!$class) {
    return jsonObj;
  }

  if (Array.isArray(jsonObj)) {
    const t = [];
    for (const val of jsonObj) {
      t.push(convertApiToObject(val, $class, root));
    }
    return t;
  } else if (isRealObject(jsonObj)) {
    const obj = new $class();
    const { $reKeyPair, $targetClass, $convertFn } = obj;
    const fnKeys = {};

    for (const key of Object.keys(jsonObj)) {
      const targetKey = $reKeyPair?.[key] || key; // key是属性key，targetKey是rename值或属性key

      const fn = $convertFn?.[targetKey];

      if ($targetClass?.[targetKey]) {
        obj[targetKey] = convertApiToObject(jsonObj[key], $targetClass[targetKey], jsonObj);
      } else {
        obj[targetKey] = fn ? fn.call(jsonObj, root, jsonObj) : jsonObj[key];
        if (fn) {
          fnKeys[targetKey] = true;
        }
      }
    }

    if ($convertFn) {
      for (const key of Object.keys($convertFn)) {

        // key是属性key
        if (!fnKeys[key]) {
          obj[key] = $convertFn[key].call(jsonObj, root, jsonObj);
        }
      }
    }

    return obj;
  } else {
    return jsonObj;
  }
}

export function decodeBase64(encoded: string): string {
  return Buffer.from(encoded, 'base64').toString('utf8');
}

export function firstLowerCase(str: string): string {
  return str.replace(/^\S/, s => s.toLowerCase());
}

export function firstUpperCase(str: string): string {
  return str.replace(/^\S/, s => s.toUpperCase());
}

export function filterMultiSlash(str: string): string {
  return str.replace(/[\/]{2,}/g, () => '/');
}

const requestConditionList = [
  (intype, ctx, name, target, ClassName?: any): boolean | undefined => {
    if (intype === 'query' && ctx.query[name]) {
      target[name] = convertApiToObject(ctx.query[name], ClassName);
      delete ctx.query[name];
      return true;
    }

    return undefined;
  },
  (intype, ctx, name, target, ClassName?: any): boolean | undefined => {
    if (intype === 'header' && ctx.request.headers[name.toLowerCase()]) {
      target[name] = convertApiToObject(ctx.request.headers[name.toLowerCase()], ClassName);
      delete ctx.request.headers[name.toLowerCase()];
      return true;
    }

    return undefined;
  },
  (intype, ctx, name, target, ClassName?: any): boolean | undefined => {
    if (intype === 'body' && ctx.request.body) {
      target[name] = convertApiToObject(JSON.parse(JSON.stringify(ctx.request.body)), ClassName);
      ctx.request.body = {};
      return true;
    }

    return undefined;
  },
  (_intype, ctx, name, target, ClassName?: any): boolean | undefined => {
    if (ctx.params[name]) {
      target[name] = convertApiToObject(ctx.params[name], ClassName);
      delete ctx.params[name];
      return true;
    }

    return undefined;
  },
];

function handleRequestType(intype, ctx, name, target, ClassName?: any): void {
  for (const condition of requestConditionList) {
    const result = condition(intype, ctx, name, target, ClassName);
    if (result !== undefined) {
      return;
    }
  }
}

export function assignObj(ctx, target): void {
  const { $inType } = target;
  if (!$inType) {
    return;
  }

  let intype = '';
  let name = '';

  for (const key of Object.keys($inType)) {
    intype = $inType[key];
    name = key;
    const className = target[name]?.$targetClass;
    handleRequestType(intype, ctx, name, target, className);
  }
}

function ruleCheck(val, rule, key?: string): ValiType {
  const result = apiSystemPlugin.lifeCycle.check.emit({
    ruleCheck,
    data: val,
    rule,
    key,
  });

  if (result === undefined) {
    return true;
  } else {
    return result;
  }
}

/**
 * 遍历 a.b[].c.d[].e, 找到所有叶子节点
 * @param target 
 * @param source 
 * @param ii 
 * @param length 
 * @param keyArr 
 * @returns 
 */
function checkDeepBody(target, source, ii, length, keyArr): void {
  const ARRSBL = '[]';
  let i = ii;
  let ctxObj = source;
  if (!ctxObj || !target) {
    return;
  }

  if (i === length - 1) {
    if (keyArr[i] === '$body$') {
      target.push(ctxObj);
    } else {
      let obj = keyArr[i];
      if (keyArr[i].endsWith(ARRSBL)) {
        obj = keyArr[i].substring(0, keyArr[i].length - ARRSBL.length);
      }
      target.push(ctxObj[obj]);
    }
  } else {
    if (keyArr[i].endsWith(ARRSBL)) {
      ctxObj = ctxObj[keyArr[i].substring(0, keyArr[i].length - ARRSBL.length)] || undefined;
      if (ctxObj) {
        i++;
        ctxObj.forEach(element => {
          checkDeepBody(target, element, i, length, keyArr);
        });
      }
    } else {
      ctxObj = ctxObj[keyArr[i]] || undefined;
      i++;
      checkDeepBody(target, ctxObj, i, length, keyArr);
    }
  }
}

const valReqList = [
  (_ctx, rule): boolean | undefined => {
    // 空对象不要校验
    if (!rule || JSON.stringify(rule) === '{}') {
      return true;
    }
    return undefined;
  },
  (ctx, rule): boolean | undefined => {
    let result: ValiType = true;
    if (rule.query) {
      const queryKeys = Object.keys(rule.query);
      for (const key of queryKeys) {
        const val = ctx.query[key];
        result = ruleCheck(val, rule.query[key]);
        if (!result) {
          return false;
        }
      }
    }

    return undefined;
  },
  (ctx, rule): boolean | undefined => {
    let result: ValiType = true;
    if (rule.path) {
      const pathKeys = Object.keys(rule.path);
      for (const key of pathKeys) {
        const val = ctx.params[key];
        result = ruleCheck(val, rule.path[key]);
        if (!result) {
          return false;
        }
      }
    }

    return undefined;
  },
  (ctx, rule): ValiType => {
    let result: ValiType = true;
    if (rule.header) {
      const headerKeys = Object.keys(rule.header);
      for (const key of headerKeys) {
        const val = ctx.request.headers[key.toLowerCase()];
        result = ruleCheck(val, rule.header[key], key.toLowerCase());
        if (!result) {
          return false;
        } else if (typeof result === 'string') {
          return result;
        }
      }
    }

    return undefined;
  },
  (ctx, rule): boolean | undefined => {
    let result: ValiType = true;
    if (rule.body) {
      const bodyKeys = Object.keys(rule.body);
      for (const key of bodyKeys) {
        // 遍历所有对象进行判断
        const keyArr = key.split('.');
        let ctxObj = ctx.request.body;
        const target = [];
        checkDeepBody(target, ctxObj, 0, keyArr.length, keyArr);
        for (let i = 0; i < target.length; i++) {
          result = ruleCheck(target[i], rule.body[key]);
          if (!result) {
            return false;
          }
        }
      }
    }

    return undefined;
  },
];

export function validateRequest(ctx, rule): ValiType {
  for (const valReqFunc of valReqList) {
    const result: ValiType = valReqFunc(ctx, rule);
    if (result !== undefined) {
      return result;
    }
  }

  return true;
}

export function checkTokenExpireRegex(token: string): boolean | undefined {
  if (!token) {
    return true;
  }

  const tokenStr = decodeBase64(token.replace(/\-/g, '/'));

  const regex = /\"expires_at\"\s*:\s*\"(((?!\").)*)\"/;
  const result = tokenStr.match(regex);

  if (result) {
    const [, expireDate] = result;
    if (!expireDate || new Date(expireDate).getTime() <= Date.now()) {
      return true;
    }
  } else {
    return true;
  }

  return undefined;
}

export function parseToken(token: string): any {
    try {
      let tokenStr = decodeBase64(token.replace(/\-/g, '/'));

      const regex = /\{\s*\"token\"\s*:\{[\s\S]*\}\s*\}/;
      const ret = tokenStr.match(regex);

      if (ret) {
        [tokenStr] = ret;
      } else {
        return null;
      }

      const obj: any = JSON.parse(tokenStr);
      return obj?.token;
    } catch(e) {
      return null;
    }
  }

  export function checkTokenExpire(token: string, retCode: any = true): ValiType {
    if (!token) {
      return retCode;
    }

    const tokenObj = parseToken(token);
    if (!tokenObj) {
      return retCode;
    }

    const expireDate = tokenObj?.expires_at;

    if (!expireDate || new Date(expireDate).getTime() <= Date.now()) {
      return retCode;
    }

    return undefined;
  }

  export function convertSnakeToLowerCamel(name: string): string {
    const nameArr = name.split('_');
    let firstDeal = false;
    for (let i = 0; i < nameArr.length; i++) {
      if (nameArr[i]) {
        const [ firstWord ] = nameArr[i];
        if (!firstDeal) {
          firstDeal = true;
          nameArr[i] = firstWord.toLowerCase() + nameArr[i].substring(1);
        } else {
          nameArr[i] = firstWord.toUpperCase() + nameArr[i].substring(1);
        }
      }
    }

    return nameArr.join('');
  }
