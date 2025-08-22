import { BasePlugin } from './base-plugin';
import TokenValidator from './extra-plugins/token-validate';
import RequireValidator from './extra-plugins/require-validate';
import ArrayValidator from './extra-plugins/array-validate';
import BasicValidator from './extra-plugins/basic-validate';
import BasicParser from './extra-plugins/basic-parse';

// 指明该插件系统的hooks
const apiSystemPlugin = new BasePlugin({
  compile(): void {}, // parser
  check(): void {}, // validator
  response(): void {}, // 响应处理
});

apiSystemPlugin.register([
  RequireValidator,
  TokenValidator,
  ArrayValidator,
  BasicValidator,
  BasicParser
]);

export default apiSystemPlugin;