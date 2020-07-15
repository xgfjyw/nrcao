
module.exports = function(RED) {
  'use strict';
  const fs = require('fs');
  //   const minimatch = require('minimatch');


  // config
  function AliyunOssConfigNode(config) {
    RED.nodes.createNode(this, config);

    this.OSS = require('ali-oss');
    this.client = new this.OSS({
      region: config.region,
      accessKeyId: config.accesskeyid,
      accessKeySecret: config.secretaccesskey,
      bucket: config.bucket
    });
    if (!this.client) {
      node.error(RED._('aliyun.warn.missing-credentials'));
    }
  }
  RED.nodes.registerType('aliyun oss config', AliyunOssConfigNode);


  //download
  function AliyunOssGetObjectNode(config) {
    RED.nodes.createNode(this, config);

    const node = this;
    node.config = RED.nodes.getNode(config.aliyun);
    node.filename = config.filename || '';

    const client = node.config ? node.config.client : null;
    if (!client) {
      node.warn(RED._('aliyun.warn.missing-credentials'));
      return;
    }

    node.on('input', function(msg) {
      // const bucket = node.bucket || msg.bucket;
      // if (bucket === '') {
      //   node.error(RED._('aliyun.error.no-bucket-specified'), msg);
      //   return;
      // }
      const filename = node.filename || msg.filename;
      if (filename === '') {
        node.warn('No filename');
        node.error(RED._('aliyun.error.no-filename-specified'), msg);
        return;
      }

      msg.filename = filename;
      node.status({fill: 'blue', shape: 'dot', text: 'aliyun.status.downloading'});
      client.get(filename).then((data)=> {
        msg.payload = data.content;
        node.status({});
        node.send(msg);
      }).catch((err) => {
        node.warn(err);
        node.error(RED._('aliyun.error.download-failed', {err: err.toString()}), msg);
      });
    });
  }
  RED.nodes.registerType('aliyun oss download', AliyunOssGetObjectNode);


  // upload
  function AliyunOssPutObjectNode(config) {
    RED.nodes.createNode(this, config);

    const node = this;
    node.config = RED.nodes.getNode(config.aliyun);
    node.filename = config.filename || '';
    node.localFilename = config.localFilename || '';
    
    const client = node.config ? node.config.client : null;
    if (!client) {
      node.warn(RED._('aliyun.warn.missing-credentials'));
      return;
    }

    // const s3 = new OSS.S3({'endpoint': node.region});
    node.status({fill: 'blue', shape: 'dot', text: 'aliyun.status.checking-credentials'});
    // s3.listObjects({Bucket: node.bucket}, function(err) {
    //   if (err) {
    //     node.warn(err);
    //     node.error(RED._('aliyun.error.aws-s3-error', {err: err}));
    //     node.status({fill: 'red', shape: 'ring', text: 'aliyun.status.error'});
    //     return;
    //   }
    //   node.status({});
    node.status({text: '1'});
    node.on('input', function(msg) {
      // const bucket = node.bucket || msg.bucket;
      // if (bucket === '') {
      //   node.error(RED._('aliyun.error.no-bucket-specified'), msg);
      //   return;
      // }
      const filename = node.filename || msg.filename;
      if (filename === '') {
        node.error(RED._('aliyun.error.no-filename-specified'), msg);
        return;
      }
      node.status({text: '2'});
      const localFilename = node.localFilename || msg.localFilename;


      client.head(filename).then((data) => {
        node.status({text: '3'});
        // file exists, append from position = length
        var position = data.res.headers['content-length']
        if (localFilename) {
          node.status({text: '4'});
          // TODO: use chunked upload for large files
          node.status({fill: 'blue', shape: 'dot', text: 'aliyun.status.uploading'});
          const stream = fs.createReadStream(localFilename);
          client.append(filename, stream, {position: position}).then((data) => {
            msg.payload = {code: data.status, msg: data.code || ''};
            node.status({});
            node.send(msg);
          }).catch((err) => {
            node.error(err.toString(), msg);
            node.status({fill: 'red', shape: 'ring', text: 'aliyun.status.failed'});
          });
        // update payload body
        } else if (typeof msg.payload !== 'undefined') {
          node.status({text: '5'});
          node.status({fill: 'blue', shape: 'dot', text: 'aliyun.status.uploading'});
          client.append(filename, RED.util.ensureBuffer(msg.payload), {position: position}).then((result) => {
            msg.payload = {code: data.status, msg: data.code || ''};
            node.status({});
            node.send(msg);
          }).catch((err) => {
            node.error(err.toString(), msg);
            node.status({fill: 'red', shape: 'ring', text: 'aliyun.status.failed'});
          });
        }

      }).catch((err) => {
        // file not exists
        if (localFilename) {
          node.status({text: '6'});
          // TODO: use chunked upload for large files
          node.status({fill: 'blue', shape: 'dot', text: 'aliyun.status.uploading'});
          const stream = fs.createReadStream(localFilename);
          client.append(filename, stream).then((data) => {
            msg.payload = {code: data.status, msg: data.code || ''};
            node.status({});
            node.send(msg);
          }).catch((err) => {
            node.error(err.toString(), msg);
            node.status({fill: 'green', shape: 'ring', text: 'aliyun.status.failed'});
          });
        // update payload body
        } else if (typeof msg.payload !== 'undefined') {
          node.status({text: '7'});
          node.status({fill: 'blue', shape: 'dot', text: 'aliyun.status.uploading'});
          client.append(filename, RED.util.ensureBuffer(msg.payload)).then((result) => {
            msg.payload = {code: data.status, msg: data.code || ''};
            node.status({});
            node.send(msg);
          }).catch((err) => {
            node.error(err.toString(), msg);
            node.status({fill: 'orange', shape: 'ring', text: 'aliyun.status.failed'});
          });
        }
      });
    });
  }
  RED.nodes.registerType('aliyun oss upload', AliyunOssPutObjectNode);
};
