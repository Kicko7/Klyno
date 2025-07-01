/**
 * S3文件服务实现
 */
export interface fileserviceimpl {
  /**
   * 创建预签名上传URL
   */
  createpresignedurl(key: string): promise<string>;

  /**
   * 创建预签名预览URL
   */
  createpresignedurlforpreview(key: string, expiresin?: number): promise<string>;

  /**
   * 删除文件
   */
  deletefile(key: string): promise<any>;

  /**
   * 批量删除文件
   */
  deletefiles(keys: string[]): promise<any>;

  /**
   * 获取文件字节数组
   */
  getfilebytearray(key: string): promise<uint8array>;

  /**
   * 获取文件内容
   */
  getfilecontent(key: string): promise<string>;

  /**
   * 获取完整文件URL
   */
  getfullfileurl(url?: string | null, expiresin?: number): promise<string>;

  /**
   * 上传内容
   */
  uploadcontent(path: string, content: string): promise<any>;
}
