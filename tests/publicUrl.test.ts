import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildPublicUrl } from '../src/server/publicUrl'

describe('公网链接构造', () => {
  it('始终使用部署站点地址，不受内部容器请求地址影响', () => {
    assert.equal(
      buildPublicUrl('/studio/project-1', 'https://love.atimefriend.cn').href,
      'https://love.atimefriend.cn/studio/project-1',
    )
  })

  it('保留查询参数并兼容站点地址末尾斜杠', () => {
    assert.equal(
      buildPublicUrl('/create?claim=invalid', 'https://love.atimefriend.cn/').href,
      'https://love.atimefriend.cn/create?claim=invalid',
    )
  })
})
