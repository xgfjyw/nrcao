
module.exports = function(RED) {
  'use strict';
  const fs = require('fs');
  //   const minimatch = require('minimatch');


  // config
  function AliyunNode(config) {
    RED.nodes.createNode(this, config);

    if (this.credentials &&
            this.credentials.accesskeyid &&
            this.credentials.secretaccesskey) {
      this.AWS = require('aws-sdk');
      this.AWS.config.update({
        accessKeyId: this.credentials.accesskeyid,
        secretAccessKey: this.credentials.secretaccesskey,
      });
    }
  }

  RED.nodes.registerType('aliyun config', AliyunNode, {
    credentials: {
      accesskeyid: {type: 'text'},
      secretaccesskey: {type: 'password'},
    },
  });


  // // download
  // function AmazonS3InNode(n) {
  //     RED.nodes.createNode(this,n);
  //     this.awsConfig = RED.nodes.getNode(n.aws);
  //     // eu-west-1||us-east-1||us-west-1||us-west-2||eu-central-1||ap-northeast-1||ap-northeast-2||ap-southeast-1||ap-southeast-2||sa-east-1
  //     this.region = n.region || "s3.cn-east-2.jdcloud-oss.com";
  //     this.bucket = n.bucket;
  //     this.filepattern = n.filepattern || "";
  //     var node = this;
  //     var AWS = this.awsConfig ? this.awsConfig.AWS : null;

  //     if (!AWS) {
  //         node.warn(RED._("aws.warn.missing-credentials"));
  //         return;
  //     }
  //     var s3 = new AWS.S3({"endpoint": node.region});
  //     node.status({fill:"blue",shape:"dot",text:"aws.status.initializing"});
  //     s3.listObjects({ Bucket: node.bucket }, function(err, data) {
  //         if (err) {
  //             node.error(RED._("aws.error.failed-to-fetch", {err:err}));
  //             node.status({fill:"red",shape:"ring",text:"aws.status.error"});
  //             return;
  //         }
  //         var contents = node.filterContents(data.Contents);
  //         node.state = contents.map(function (e) { return e.Key; });
  //         node.status({});
  //         node.on("input", function(msg) {
  //             node.status({fill:"blue",shape:"dot",text:"aws.status.checking-for-changes"});
  //             s3.listObjects({ Bucket: node.bucket }, function(err, data) {
  //                 if (err) {
  //                     node.error(RED._("aws.error.failed-to-fetch", {err:err}),msg);
  //                     node.status({});
  //                     return;
  //                 }
  //                 node.status({});
  //                 var newContents = node.filterContents(data.Contents);
  //                 var seen = {};
  //                 var i;
  //                 msg.bucket = node.bucket;
  //                 for (i = 0; i < node.state.length; i++) {
  //                     seen[node.state[i]] = true;
  //                 }
  //                 for (i = 0; i < newContents.length; i++) {
  //                     var file = newContents[i].Key;
  //                     if (seen[file]) {
  //                         delete seen[file];
  //                     } else {
  //                         msg.payload = file;
  //                         msg.file = file.substring(file.lastIndexOf('/')+1);
  //                         msg.event = 'add';
  //                         msg.data = newContents[i];
  //                         node.send(msg);
  //                     }
  //                 }
  //                 for (var f in seen) {
  //                     if (seen.hasOwnProperty(f)) {
  //                         msg.payload = f;
  //                         msg.file = f.substring(f.lastIndexOf('/')+1);
  //                         msg.event = 'delete';
  //                         // msg.data intentionally null
  //                         node.send(msg);
  //                     }
  //                 }
  //                 node.state = newContents.map(function (e) {return e.Key;});
  //             });
  //         });
  //         var interval = setInterval(function() {
  //             node.emit("input", {});
  //         }, 900000); // 15 minutes
  //         node.on("close", function() {
  //             if (interval !== null) {
  //                 clearInterval(interval);
  //             }
  //         });
  //     });
  // }

  // AmazonS3InNode.prototype.filterContents = function(contents) {
  //     var node = this;
  //     return node.filepattern ? contents.filter(function (e) {
  //         return minimatch(e.Key, node.filepattern);
  //     }) : contents;
  // };

  // RED.nodes.registerType("jdcloud download", AmazonS3InNode);

  function AliyunOssGetObjectNode(config) {
    RED.nodes.createNode(this, config);

    const node = this;
    node.config = RED.nodes.getNode(config.aliyun);
    node.region = config.region; // || "s3.cn-east-2.jdcloud-oss.com";
    node.bucket = config.bucket;
    node.filename = config.filename || '';

    const AWS = node.config ? node.config.AWS : null;

    if (!AWS) {
      node.warn(RED._('aws.warn.missing-credentials'));
      return;
    }
    const s3 = new AWS.S3({'endpoint': node.region});

    node.on('input', function(msg) {
      const bucket = node.bucket || msg.bucket;
      if (bucket === '') {
        node.error(RED._('aws.error.no-bucket-specified'), msg);
        return;
      }
      const filename = node.filename || msg.filename;
      if (filename === '') {
        node.warn('No filename');
        node.error(RED._('aws.error.no-filename-specified'), msg);
        return;
      }

      msg.bucket = bucket;
      msg.filename = filename;
      node.status({fill: 'blue', shape: 'dot', text: 'aws.status.downloading'});
      s3.getObject({
        Bucket: bucket,
        Key: filename,
      }, function(err, data) {
        if (err) {
          node.warn(err);
          node.error(RED._('aws.error.download-failed', {err: err.toString()}), msg);
          return;
        }

        msg.payload = data.Body;
        node.status({});
        node.send(msg);
      });
    });
  }
  RED.nodes.registerType('aliyun oss download', AliyunOssGetObjectNode);


//   // upload
//   function AmazonS3OutNode(n) {
//     RED.nodes.createNode(this, n);
//     this.awsConfig = RED.nodes.getNode(n.aws);
//     this.region = n.region || 's3.cn-east-2.jdcloud-oss.com';
//     this.bucket = n.bucket;
//     this.filename = n.filename || '';
//     this.localFilename = n.localFilename || '';
//     const node = this;
//     const AWS = this.awsConfig ? this.awsConfig.AWS : null;

//     if (!AWS) {
//       node.warn(RED._('aws.warn.missing-credentials'));
//       return;
//     }
//     if (AWS) {
//       const s3 = new AWS.S3({'endpoint': node.region});
//       node.status({fill: 'blue', shape: 'dot', text: 'aws.status.checking-credentials'});
//       s3.listObjects({Bucket: node.bucket}, function(err) {
//         if (err) {
//           node.warn(err);
//           node.error(RED._('aws.error.aws-s3-error', {err: err}));
//           node.status({fill: 'red', shape: 'ring', text: 'aws.status.error'});
//           return;
//         }
//         node.status({});
//         node.on('input', function(msg) {
//           const bucket = node.bucket || msg.bucket;
//           if (bucket === '') {
//             node.error(RED._('aws.error.no-bucket-specified'), msg);
//             return;
//           }
//           const filename = node.filename || msg.filename;
//           if (filename === '') {
//             node.error(RED._('aws.error.no-filename-specified'), msg);
//             return;
//           }
//           const localFilename = node.localFilename || msg.localFilename;
//           if (localFilename) {
//             // TODO: use chunked upload for large files
//             node.status({fill: 'blue', shape: 'dot', text: 'aws.status.uploading'});
//             const stream = fs.createReadStream(localFilename);
//             s3.putObject({
//               Bucket: bucket,
//               Body: stream,
//               Key: filename,
//             }, function(err) {
//               if (err) {
//                 node.error(err.toString(), msg);
//                 node.status({fill: 'red', shape: 'ring', text: 'aws.status.failed'});
//                 return;
//               }
//               node.status({});
//             });
//           } else if (typeof msg.payload !== 'undefined') {
//             node.status({fill: 'blue', shape: 'dot', text: 'aws.status.uploading'});
//             s3.putObject({
//               Bucket: bucket,
//               Body: RED.util.ensureBuffer(msg.payload),
//               Key: filename,
//             }, function(err) {
//               if (err) {
//                 node.error(err.toString(), msg);
//                 node.status({fill: 'red', shape: 'ring', text: 'aws.status.failed'});
//                 return;
//               }
//               node.status({});
//             });
//           }
//         });
//       });
//     }
//   }
//   RED.nodes.registerType('jdcloud upload', AmazonS3OutNode);
};