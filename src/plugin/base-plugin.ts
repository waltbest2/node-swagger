import { LifeCycle, Life, getLifeCycle } from './lifecycle';

export class BasePlugin {
  private _lifeCycle: LifeCycle;
  private life: Life;
  private metaData;

  constructor(life: Life) {
    this.setMetaData({});
    this.life = life;
    this._lifeCycle = getLifeCycle(life, this.metaData);

    this.life.meta = this.metaData;
  }

  setMetaData(metaData): void {
    this.metaData = metaData;
  }

  updateMetaData(metaData): void {
    const keys = Object.keys(metaData);
    keys.forEach((key) => {
      this.metaData[key] = metaData[key];
    });
  }

  get lifeCycle(): LifeCycle {
    return this._lifeCycle;
  }

  register(plugin): void {
    const keys = Object.keys(this._lifeCycle);
    if (Array.isArray(plugin)) {
      plugin.forEach(p => this.registerSinglePlugin(p, keys));
    } else {
      this.registerSinglePlugin(plugin, keys);
    }
  }

  async run(): Promise<void> {
    const keys = Object.keys(this._lifeCycle);
    for (const key of keys) {
      if (Object.prototype.toString.call(this.life[key]).includes('Function')) {
        const retParams = await this.life[key](this._lifeCycle[key]);
        this.updateMetaData(retParams);
      }
    }
  }

  private registerSinglePlugin(plugin, keys: string[]): void {
    plugin.meta = this.metaData;
    keys.forEach((key) => {
      this._lifeCycle[key].on(plugin);
    });
  }
}