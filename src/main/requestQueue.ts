type Task = () => Promise<void>

class RequestQueue {
  private queue: Task[] = []
  private running = 0
  private maxConcurrent: number

  constructor(maxConcurrent = 2) {
    this.maxConcurrent = maxConcurrent
  }

  add(task: Task): void {
    this.queue.push(task)
    this.runNext()
  }

  private runNext(): void {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) return

    const task = this.queue.shift()!
    this.running++
    task().finally(() => {
      this.running--
      this.runNext()
    })
  }
}

export const thumbnailQueue = new RequestQueue(1)
export const previewQueue = new RequestQueue(1)
