export class SyncHooks {
  private tasks: any[];
  private meta;
  private step: string;

  constructor(step: string) {
    this.tasks = [];
    this.step = step;
  }

  on(task: any): void {
    this.tasks.push(task);
  }

  setMeta(meta: any): void {
    this.meta = meta;
  }

  emit(meta?): any {
    if (meta) {
      this.setMeta(meta);
    }

    const tempTasks = [];

    for (const t of this.tasks) {
      const task = t[this.step];
      if (task) {
        if (task.once !== true) {
          tempTasks.push(t);
        }

        const ret = task.call(t, this.meta);

        if (ret !== undefined) {
          return ret;
        }
      }
    }

    this.tasks = tempTasks;
    return undefined;
  }
}