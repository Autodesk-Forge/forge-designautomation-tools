'use strict'; // http://www.w3schools.com/js/js_strict.asp

// token handling in session
var token = require('./token');

// web framework
var express = require('express');
var router = express.Router();

var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
var rawParser = bodyParser.raw({ limit: '10mb' });
const request = require('request');
const requestPromise = require('request-promise');

var config = require('./config');

async function daRequest(req, path, method, headers, body) {
    headers = headers || {};
    if (!headers['Authorization']) {
        var tokenSession = new token(req.session);
        var credentials = tokenSession.getCredentials();

        headers['Authorization'] = 'Bearer ' + credentials.access_token;
        headers['content-type'] = 'application/json';
    }

    let url = 'https://developer.api.autodesk.com/da/us-east/v3/' + path;
    let options = {
        uri: url,
        method: method,
        headers: headers,
        json: true
    };

    if (body) {
        options.body = body;
    }
    
    let data = [];
    while (true) {
        let response = await requestPromise(options);
    
        if (!response.paginationToken) {
            if (data.length > 0) {
                response.data = [...response.data, ...data];
            }

            return response;
        } else {
            options.uri = url + "?page=" + response.paginationToken;
            data = [...data, ...response.data];
        }
    } 
    
}

/*
router.post('POST /buckets', jsonParser, function(req, res) {
    console.log('/buckets');
    var tokenSession = new token(req.session);

    var bucketName = req.body.bucketName
    var bucketType = req.body.bucketType

    var buckets = new forgeSDK.BucketsApi();
    buckets.createBucket({
        "bucketKey": bucketName,
        "policyKey": bucketType
    }, {}, tokenSession.getOAuth(), tokenSession.getCredentials())
        .then(function(data) {
            res.json(data.body)
        })
        .catch(function(error) {
            res.status(error.statusCode).json({ message: error.statusMessage});
        })

})

router.get('GET /files/:id', function(req, res) {
    console.log('/files/:id');
    var id = req.params.id
    var boName = getBucketKeyObjectName(id)

    var tokenSession = new token(req.session);

    var objects = new forgeSDK.ObjectsApi();
    objects.getObject(boName.bucketKey, boName.objectName, {}, tokenSession.getOAuth(), tokenSession.getCredentials())
        .then(function(data) {
            var fileParts = boName.objectName.split('.')
            var fileExt = fileParts[fileParts.length - 1];
            res.set('content-type', 'application/octet-stream');
            res.set('Content-Disposition', 'attachment; filename="' + boName.objectName + '"');
            res.end(data.body);
        })
        .catch(function(error) {
            res.status(error.statusCode).json({ message: error.statusMessage});
        });
})

router.delete('/files/:id', function(req, res) {
    console.log('DELETE /files/:id');
    var tokenSession = new token(req.session)

    var id = req.params.id
    var boName = getBucketKeyObjectName(id)

    var objects = new forgeSDK.ObjectsApi();
    var objectName = decodeURIComponent(boName.objectName)
    objects.deleteObject(boName.bucketKey, objectName, tokenSession.getOAuth(), tokenSession.getCredentials())
        .then(function(data) {
            res.json({ status: "success" })
        })
        .catch(function(error) {
            res.status(error.statusCode).json({ message: error.statusMessage});
        })
})

router.get('/files/:id/publicurl', function(req, res) {
    console.log('GET /files/:id/publicurl');
    var id = req.params.id
    var boName = getBucketKeyObjectName(id)

    var tokenSession = new token(req.session);

    var objects = new forgeSDK.ObjectsApi();
    objects.createSignedResource(boName.bucketKey, boName.objectName, {}, {}, tokenSession.getOAuth(), tokenSession.getCredentials())
        .then(function(data) {
            res.json(data.body);
        })
        .catch(function(error) {
            res.status(error.statusCode).json({ message: error.statusMessage});
        });
})

router.delete('/buckets/:id', function(req, res) {
    console.log('DELETE /buckets/:id');
    var tokenSession = new token(req.session)

    var id = req.params.id

    var buckets = new forgeSDK.BucketsApi();
    buckets.deleteBucket(id, tokenSession.getOAuth(), tokenSession.getCredentials())
        .then(function(data) {
            res.json({ status: "success" })
        })
        .catch(function(error) {
            res.status(error.statusCode).json({ message: error.statusMessage});
        })
})


router.post('/files', jsonParser, function(req, res) {
    console.log('POST /files');
    // Uploading a file to app bucket

    var tokenSession = new token(req.session);

    var fileName = '';
    var form = new formidable.IncomingForm();
    var uploadedFile;
    var bucketName = req.headers.id

    // Receive the file
    var fileData;

    form
        .on('data', function(data) {
            fileData = data;
        })

        .on('field', function(field, value) {
            console.log(field, value);
        })
        .on('file', function(field, file) {
            console.log(field, file);
            uploadedFile = file;
        })
        .on('end', function() {
            if (uploadedFile.name == '') {
                res.status(500).end('No file submitted!');
            }

            console.log('-> file received');

            // Create file on A360
            fs.readFile(uploadedFile.path, function(err, fileData) {
                // Upload the new file
                var objects = new forgeSDK.ObjectsApi();
                objects.uploadObject(bucketName, uploadedFile.name, uploadedFile.size, fileData, {}, tokenSession.getOAuth(), tokenSession.getCredentials())
                    .then(function(objectData) {
                        console.log('uploadObject: succeeded');
                        res.json(objectData.body);
                    })
                    .catch(function(error) {
                        console.log('uploadObject: failed');
                        res.status(error.statusCode).end(error.statusMessage);
                    });
            });

        });

    form.multiples = true;
    form.parse(req);
});

router.post('/chunks', rawParser, function(req, res) {
    console.log('POST /chunks');
    // Uploading a file to app bucket

    var tokenSession = new token(req.session);

    var fileName = req.headers['x-file-name'];
    var bucketName = req.headers.id
    var data = req.body;
    var range = req.headers.range;
    var sessionId = req.headers.sessionid;

    // Upload the new file
    var objects = new forgeSDK.ObjectsApi();
    objects.uploadChunk(bucketName, fileName, data.length, range, sessionId, data, {}, tokenSession.getOAuth(), tokenSession.getCredentials())
        .then(function(objectData) {
            console.log('uploadObject: succeeded');
            res.status(objectData.statusCode).json(objectData.body);
        })
        .catch(function(error) {
            console.log('uploadObject: failed');
            try {
                res.status(error.statusCode).end(error.statusMessage);
            } catch (Exception) {
                res.status(500).end("Unknown error");
            }
        });

});

*/

/////////////////////////////////////////////////////////////////
// Items (AppBundles and Activities)
/////////////////////////////////////////////////////////////////

function getNameParts(name) {
    var parts1 = name.split('.');
    var parts2 = parts1[1].split('+');

    return [parts1[0], parts2[0], parts2[1]];
}

function getFullName(nickName, name, alias) {
    return `${nickName}.${name}+${alias}`;
}

async function getItems(req, type, isPersonal) {
    let response = await daRequest(req, type, 'GET');
    let nickname = await daRequest(req, 'forgeapps/me', 'GET');
    let items = [];

    response.data.forEach((item, index) => {
        if (!item.startsWith(nickname) ^ isPersonal) {
            // Show only personal items
            let nameParts = getNameParts(item);
            if (!includesItem(items, nameParts[1])) {
                items.push({
                    id: nameParts[1],
                    nickName: nameParts[0],
                    alias: nameParts[2],
                    children: isPersonal
                });
            }
        }
    })

    return items;
}

async function getItem(req, type, id) {
    let response = await daRequest(req, `${type}/${id}`, 'GET');

    return response;
}

async function uploadFile(inputUrl, uploadParameters) {
    var downloadOptions = {
        uri: inputUrl,
        method: 'GET'
    }

    var uploadOptions = {
        uri: uploadParameters.endpointURL,
        method: 'POST',
        headers: {
            'Content-Type': 'multipart/form-data',
            'Cache-Control': 'no-cache'
        },
        formData: uploadParameters.formData
    }
    uploadOptions.formData.file = request(downloadOptions);

    await requestPromise(uploadOptions);
}

async function createItem(req, type, body) {
    let response = await daRequest(req, `${type}`, 'POST', null, body);

    // Upload the file from OSS
    if (response.uploadParameters) {
        try {
            await uploadFile(body.bundle, response.uploadParameters)
        } catch { }
    }

    return response;
}

async function deleteItem(req, type, id) {
    let response = await daRequest(req, `${type}/${id}`, 'DELETE');

    return { response: 'done' };
}

function includesItem(list, id) {
    return list.find(item => {
        if (item.id === id) {
            return true;
        }
    });
}

function setItemVersionsChildren(versions, aliases) {
    aliases.forEach(alias => {
        versions.find(version => {
            if (version.id === alias.version) {
                version.children = true;
                return true;
            }
        });
    })
}

async function getItemVersions(req, type, id) {
    let versions = [];
    let page = '';

    while (true) {
        let response = await daRequest(req, `${type}/${id}/versions?${page}`, 'GET');
        response.data.map((item) => {
            versions.push({ id: item, children: false });
        })

        if (!response.paginationToken)
            break;

        page = `page=${response.paginationToken}`;
    }

    return versions;
}

async function createItemVersion(req, type, id, body) {
    let response = await daRequest(req, `${type}/${id}/versions`, 'POST', null, body);

    // Upload the file from OSS
    if (response.uploadParameters) {
        try {
            await uploadFile(body.bundle, response.uploadParameters)
        } catch { }
    }

    return response;
}

async function deleteItemVersion(req, type, id, version) {
    let response = await daRequest(req, `${type}/${id}/versions/${version}`, 'DELETE');

    return { response: 'done' };
}

async function getItemAliases(req, type, id) {
    let aliases = [];

    while (true) {
        let response = await daRequest(req, `${type}/${id}/aliases`, 'GET');

        aliases = aliases.concat(response.data);

        if (!response.paginationToken)
            break;
    }

    return aliases;
}

function getAliasesForVersion(aliases, version) {
    let versionAliases = [];

    aliases.forEach((item, index) => {
        if (item.version === version) {
            versionAliases.push(item);
        }
    })

    return versionAliases;
}

async function createItemAlias(req, type, id, version, alias) {
    let response = await daRequest(req, `${type}/${id}/aliases`, 'POST', null, {
        "version": parseInt(version), // has to be numeric
        "id": alias
    });

    return response; 
}

async function deleteItemAlias(req, type, id, alias) {
    let response = await daRequest(req, `${type}/${id}/aliases/${alias}`, 'DELETE');

    return { response: 'done' };
}

router.get('/:type/treeNode', async function(req, res) {
    console.log('GET /:type/treeNode');
    try {
        var id = decodeURIComponent(req.query.id);
        var type = req.params.type;
        console.log(`GET /:type/treeNode, :type = ${type}, id = ${id}`);

        var folders = [
            { id: 'Personal', children: true },
            { id: 'Shared', children: true }
        ];
        var paths = id.split('/');
        var level = paths.length;

        // Levels are:
        // Root >> Personal/Shared >> Items >> Versions >> Aliases
        // Root >> Personal/Shared >> Activities >> Versions >> Aliases
        // e.g. "Personal/ChangeParams/98/prod"

        if (id === '#') {
            // # stands for ROOT
            res.json(makeTree(folders, 'folder', '', true));
        } else if (level === 1) {
            var items = await getItems(req, type, id === 'Personal');
            res.json(makeTree(items, 'item', `${id}/`));
        } else if (level === 2) {
            var appName = paths[1];
            var versions = await getItemVersions(req, type, appName);
            var aliases = await getItemAliases(req, type, appName);
            setItemVersionsChildren(versions, aliases);
            res.json(makeTree(versions, 'version', `${id}/`));
        } else if (level === 3) {
            var appName = paths[1];
            var aliases = await getItemAliases(req, type, appName);
            var versionAliases = getAliasesForVersion(aliases, parseInt(paths[2]));
            res.json(makeTree(versionAliases, 'alias', `${id}/`));
        }
    } catch (ex) {
        res.status(ex.statusCode ? ex.statusCode : 500).json({ message: (ex.message ? ex.message : ex) });
    }
});

router.get('/:type/info', async function(req, res) {
    console.log('GET /:type/info');
    try {
        var id = decodeURIComponent(req.query.id);
        var type = req.params.type;
        console.log(`GET /:type/info, :type = ${type}, id = ${id}`);

        var paths = id.split('/');
        var level = paths.length;

        if (level === 1) {
            var info = await getItem(req, type, id);
            console.log(info);
            res.json(info);
        } else if (level === 2) {
            // item
            if (paths[0] === 'Shared') {
                var nickName = req.query.nickName;
                var alias = req.query.alias;
                var fullName = getFullName(nickName, paths[1], alias);
                var info = await getItem(req, type, fullName);
                console.log(info);
                res.json(info);
            }
        } else if (level === 3) {
            // version

        } else if (level === 4) {
            // alias
            var nickName = decodeURIComponent(req.query.nickName);
            var fullName = getFullName(nickName, paths[1], paths[3]);
            var info = await getItem(req, type, fullName);
            console.log(info);
            res.json(info);
        } else {
            // Bad daRequest
            res.status(400).end();
        }
    } catch (ex) {
        res.status(ex.statusCode ? ex.statusCode : 500).json({ message: (ex.message ? ex.message : ex) });
    }
});

router.post('/:type', jsonParser, async function(req, res) {
    console.log('POST /:type');
    try {
        var id = req.body.id;
        var type = req.params.type;
        console.log(`POST /:type, :type = ${type}, id = ${id}`);

        var paths = id.split('/');
        var level = paths.length;

        if (level === 1) {
            // create item for folder
            var reply = await createItem(req, type, req.body.body);
            res.json(reply);
        } else if (level === 2) {
            // create version for item
            var reply = await createItemVersion(req, type, paths[1], req.body.body);
            res.json(reply);
        } else if (level === 3) {
            // create alias for version
            var reply = await createItemAlias(req, type, paths[1], paths[2], req.body.alias);
            res.json(reply);
        } else {
            // create workitem
            var reply = await createItem(req, type, req.body.body);
            res.json(reply);
        }
    } catch (ex) {
        console.log(ex);
        res.status(ex.statusCode ? ex.statusCode : 500).json({ message: (ex.message ? ex.message : ex) });
    }
});

router.delete('/:type/:id', async function(req, res) {
    console.log('DELETE /:type/:id');
    try {
        var id = decodeURIComponent(req.params.id);
        var type = req.params.type;
        console.log(`DELETE /:type, :type = ${type}, id = ${id}`);

        var paths = id.split('/');
        var level = paths.length;

        if (level === 1) {
            // item
            var reply = await deleteItem(req, type, paths[0]);
            res.json(reply);
        } else if (level === 2) {
            // item
            var reply = await deleteItem(req, type, paths[1]);
            res.json(reply);
        } else if (level === 3) {
            // version
            var reply = await deleteItemVersion(req, type, paths[1], paths[2]);
            res.json(reply);
        } else if (level === 4) {
            // version
            var reply = await deleteItemAlias(req, type, paths[1], paths[3]);
            res.json(reply);
        }
    } catch (ex) {
        res.status(ex.statusCode ? ex.statusCode : 500).json({ message: (ex.message ? ex.message : ex) });
    }
});

/////////////////////////////////////////////////////////////////
// WorkItems
/////////////////////////////////////////////////////////////////

router.get('/workitems/treeNode', async function(req, res) {
    console.log('GET /workitems/treeNode');
    try {
        var id = decodeURIComponent(req.query.id);
        console.log("GET /workitems/treeNode, id = " + id);

        var tokenSession = new token(req.session);
        var folders = [
            { id: 'Personal', children: true },
            { id: 'Shared', children: true }
        ];
        var paths = id.split('/');
        var level = paths.length;

        // Levels are:
        // Root >> Personal/Shared >> Bundles >> Versions >> Aliases
        // e.g. "Personal/ChangeParams/98/prod"

        if (id === '#') {
            // # stands for ROOT
            res.json(makeTree(folders, 'folder', '', true));
        } else if (level === 1) {
            var items = await getItems(req, type, id === 'Personal');
            res.json(makeTree(items, 'appbundle', `${id}/`));
        } else if (level === 2) {
            var appName = paths[1];
            var versions = await getItemVersions(req, type, appName);
            var aliases = await getItemAliases(req, appName);
            setItemVersionsChildren(versions, aliases);
            res.json(makeTree(versions, 'version', `${id}/`));
        } else {
            var appName = paths[1];
            var aliases = await getItemAliases(req, appName);
            //var versionAliases = getVersionAliases(paths[2], aliases);
            res.json(makeTree(aliases, 'alias', `${id}/`));
        }
    } catch (ex) {
        res.status(ex.statusCode ? ex.statusCode : 500).json({ message: (ex.message ? ex.message : ex) });
    }
});

/////////////////////////////////////////////////////////////////
// Collects the information that we need to pass to the
// file tree object on the client
/////////////////////////////////////////////////////////////////
function makeTree(items, type, prefix) {
    if (!items) return '';
    var treeList = [];
    items.forEach(function(item, index) {
        var treeItem = {
            id: prefix + item.id,
            nickName: item.nickName,
            alias: item.alias,
            text: item.id,
            type: type,
            children: item.children
        };
        console.log(treeItem);
        treeList.push(treeItem);
    });

    return treeList;
}

/////////////////////////////////////////////////////////////////
// Return the router object that contains the endpoints
/////////////////////////////////////////////////////////////////
module.exports = router;