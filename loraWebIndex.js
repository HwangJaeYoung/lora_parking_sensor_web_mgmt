/**
 * Created by JaeYoungHwang on 2017-01-11.
 */

var fs = require('fs');
var ejs = require('ejs');
var xlsx = require('xlsx');
var http = require('http');
var CORS = require('cors')();
var async = require('async');
var express = require('express');
var nodemailer = require('nodemailer');
var bodyParser = require('body-parser');
var requestToServer = require('request');

require('date-utils');
require('dotenv').config();

var loraWebIndex = express();

loraWebIndex.use(CORS);
loraWebIndex.use(bodyParser.json());
loraWebIndex.use(bodyParser.urlencoded({extended: false}));
loraWebIndex.use(express.static('ajax'));
loraWebIndex.use(express.static('bootstrap'));
loraWebIndex.use(express.static('bootstrap_cover'));
loraWebIndex.use(express.static('pages'));
loraWebIndex.use(express.static('scripts'));
loraWebIndex.use(express.static('styles'));
loraWebIndex.use(express.static('images'));
loraWebIndex.use(express.static('MDBChartLib'));

var retreiveExecutionForStatus = function (containerName, loraStatusArray, callBackResponse) {

    var targetURL = "http://203.253.128.161:7579/Mobius/iotParking/parkingSpot/" + containerName + "/status" + "/la";

    requestToServer({
        url: targetURL,
        method: 'GET',
        json: true,
        headers: { // Basic AE resource structure for registration
            'Accept': 'application/json',
            'X-M2M-RI': '12345',
            'X-M2M-Origin': 'Origin',
        }
    }, function (error, oneM2MResponse, body) {
        if(typeof(oneM2MResponse) !== 'undefined') {

            console.log(oneM2MResponse.statusCode)

            var tempJSONObject = new Object();

            if (oneM2MResponse.statusCode == 200) {
                var root = oneM2MResponse.body;
                var contentInstance = root['m2m:cin'];
                var creationTime = contentInstance['ct'];
                var parksingStatus = contentInstance['con'];

                console.log(containerName + " : " + creationTime);

                var loraSensorName = containerName;

                tempJSONObject.deviceName = loraSensorName;
                tempJSONObject.creationTime = creationTime;
                tempJSONObject.parkingStatus = parksingStatus;
                loraStatusArray.push(tempJSONObject);
            } else if (oneM2MResponse.statusCode == 404) {
                var loraSensorName = containerName;

                tempJSONObject.deviceName = loraSensorName;
                tempJSONObject.creationTime = '-';
                tempJSONObject.parkingStatus = '-';
                loraStatusArray.push(tempJSONObject);
            }

            callBackResponse(oneM2MResponse.statusCode);
        }
    });
};

// Getting the lora Uplink status
var retreiveExecutionForStatus_for_uplink = function (containerName, loraStatusArray, callBackResponse) {

    var targetURL = "http://203.253.128.161:7579/Mobius/9999991000000057/" + containerName  + "/up/la";

    requestToServer({
        url: targetURL,
        method: 'GET',
        json: true,
        headers: { // Basic AE resource structure for registration
            'Accept': 'application/json',
            'X-M2M-RI': '12345',
            'X-M2M-Origin': 'Origin',
        }
    }, function (error, oneM2MResponse, body) {
        if(typeof(oneM2MResponse) !== 'undefined') {

            var tempJSONObject = new Object();

            if(oneM2MResponse.statusCode == 200) {
                var root = oneM2MResponse.body;
                var contentInstance = root['m2m:cin'];
                var creationTime = contentInstance['ct'];
                var parksingStatus = contentInstance['con'];

                console.log(containerName + " : " + creationTime);

                var loraSensorName = containerName;

                tempJSONObject.deviceEUI = loraSensorName;

                if(creationTime != null)
                    tempJSONObject.creationTime = creationTime;
                else
                    tempJSONObject.creationTime = '-';

                if(parksingStatus != null)
                    tempJSONObject.parkingStatus = parksingStatus;
                else
                    tempJSONObject.parkingStatus = '-';

                loraStatusArray.push(tempJSONObject);
            } else if(oneM2MResponse.statusCode == 404) {
                var loraSensorName = containerName;

                tempJSONObject.deviceEUI = loraSensorName;
                tempJSONObject.creationTime = '-';
                tempJSONObject.parkingStatus = '-';
                loraStatusArray.push(tempJSONObject);
            }

            callBackResponse(oneM2MResponse.statusCode);
        }
    });
};

var retrieveComponentsStatus = function (targetServerName, targetURL, callBackResponse) {

    var headers = '';
    var targetURL = targetURL;

    if(targetServerName == 'MOBIUS') {
        headers = {
            'Accept': 'application/json',
            'X-M2M-RI': '12345',
            'X-M2M-Origin': 'Origin'
        }
    } else if(targetServerName == 'TTNIPE' || targetServerName == 'SPNIPE') {
        headers = {
            'Accept': 'application/json',
        }
    }

    requestToServer({
        url: targetURL,
        method: 'GET',
        json: true,
        headers: headers
    }, function (error, response, body) {
        if(typeof(response) !== 'undefined') {
            callBackResponse(response.statusCode);
        } else { // server errors -> internal server errors
            callBackResponse(500);
        }
    });
};

// Collecting the LoRa Sensors status
loraWebIndex.get('/localLoraSensorsStatusCollector', function (request, response) {

    var loraStatusArray = new Array();
    var iterationCount = 1;

    async.whilst(
        function() {
            return iterationCount < 136 //136
        },

        function (async_for_loop_callback) {
            var containerName;

            if(iterationCount < 10) {
                containerName = "KETI00" + iterationCount;
            } else if (iterationCount < 100) {
                containerName = "KETI0" + iterationCount;
            } else {
                containerName = "KETI" + iterationCount;
            }

            retreiveExecutionForStatus(containerName, loraStatusArray, function (statusCode) {
                if(statusCode == 200) {
                    iterationCount++;
                    async_for_loop_callback (null, iterationCount);
                }  else if (statusCode == 404) {
                    iterationCount++;
                    async_for_loop_callback (null, iterationCount);
                } else {
                    console.log("This condition is going to be covered later");
                }
            });
        },

        function (err, n) {
            var loraSensorJSONObject = new Object();
            loraSensorJSONObject.loraSensorsList = loraStatusArray;
            response.status(200).send(loraSensorJSONObject);
        }
    );
});

// Collecting the LoRa Sensors status
loraWebIndex.get('/localLoraSensorsStatusCollectorForUplink', function (request, response) {

    // Read the sensor_list sheet for getting the parking sensor device ID
    fs.readFile('sensor_list/lora_parking_text.txt', 'utf-8', function (err, data) {
        if (err) {
            console.log("FATAL An error occurred trying to read in the file: " + err);
        } else {
            var loraSensorIDArray = data.split("\n");

            var loraStatusArray = new Array();
            var iterationCount = 1;

            async.whilst(
                function() {
                    return iterationCount < 133 // 133
                },

                function (async_for_loop_callback) {
                    var containerName;
                    containerName = loraSensorIDArray[iterationCount - 1];

                    retreiveExecutionForStatus_for_uplink(containerName, loraStatusArray, function (statusCode) {

                        if(statusCode == 200) {
                            iterationCount++;
                            async_for_loop_callback (null, iterationCount);
                        } else if (statusCode == 404) {
                            iterationCount++;
                            async_for_loop_callback (null, iterationCount);
                        } else {
                            console.log("This condition is going to be covered later");
                        }
                    });
                },

                function (err, n) {
                    var loraSensorJSONObject = new Object();
                    loraSensorJSONObject.loraSensorsList = loraStatusArray;
                    response.status(200).send(loraSensorJSONObject);
                }
            );
        }
    });
});

// Collecting the LoRa Sensors info
loraWebIndex.get('/localLoraSensorsInfoCollector', function (request, response) {

    var loraStatusArray = new Array();
    var iterationCount = 1;

    async.whilst(
        function() {
            return iterationCount < 133 //133
        },

        function (async_for_loop_callback) {
            var containerName;

            if(iterationCount < 10) {
                containerName = "KETI00" + iterationCount;
            } else if (iterationCount < 100) {
                containerName = "KETI0" + iterationCount;
            } else {
                containerName = "KETI" + iterationCount;
            }

            retreiveExecutionForStatus(containerName, loraStatusArray, function (statusCode) {
                if(statusCode == 200) {
                    iterationCount++;
                    async_for_loop_callback (null, iterationCount);
                } else {
                    console.log("This condition is going to be covered later");
                }
            });
        },

        function (err, n) {
            var loraSensorJSONObject = new Object();
            loraSensorJSONObject.loraSensorsList = loraStatusArray;
            response.status(200).send(loraSensorJSONObject);
        }
    );
});

// Getting the lora Kerlink IPE status
loraWebIndex.get('/loraKerlinkStatus', function (request, response) {

    var targetURL = "http://localhost:7591/loraipe";

    requestToServer({
        url: targetURL,
        method: 'GET',
        json: true,
    }, function (error, oneM2MResponse, body) {
        if(typeof(oneM2MResponse) !== 'undefined') {
            response.status(200).send('{"success" : "Updated Successfully", "status" : 200}');
        }
    });
});

// Getting the lora TTN IPE status
loraWebIndex.get('/loraTTNStatus', function (request, response) {

    var targetURL = "http://203.253.128.161:7579/Mobius/iotParking/parkingSpot/" + containerName + "/status" + "/la";

    requestToServer({
        url: targetURL,
        method: 'GET',
        json: true,
        headers: { // Basic AE resource structure for registration
            'Accept': 'application/json',
            'X-M2M-RI': '12345',
            'X-M2M-Origin': 'Origin',
        }
    }, function (error, oneM2MResponse, body) {
        if(typeof(oneM2MResponse) !== 'undefined') {
            var root = oneM2MResponse.body;
            var contentInstance = root['m2m:cin'];
            var creationTime = contentInstance['ct'];
            var parksingStatus = contentInstance['con'];

            console.log(containerName + " : " + creationTime);

            var loraSensorName = containerName;

            var tempJSONObject = new Object();
            tempJSONObject.deviceName = loraSensorName;
            tempJSONObject.creationTime = creationTime;
            tempJSONObject.parkingStatus = parksingStatus;
            loraStatusArray.push(tempJSONObject);

            callBackResponse(oneM2MResponse.statusCode);
        }
    });
});


// E-mail function test
loraWebIndex.get('/loraEmailSendingTest', function (request, response) {
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_ID,
            pass: process.env.EMAIL_PWD
        }
    });

    var mailOptions = {
        from: 'forest62590@gmail.com',
        to: 'forest62590@naver.com',
        subject: 'Sending Email using Node.js',
        html: '<h1>Welcome</h1><p>That was easy!</p>'
    };

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
});

// functions for the loraPoc.html ==================================
loraWebIndex.get('/getComponentsStatus', function (request, response) {

    async.waterfall([

        // Check the Mobius status
        function(callback) {
            var mobiusStatus = '';
            targetServerName = 'MOBIUS';
            targetURL = 'http://203.253.128.161:7579/Mobius';

            retrieveComponentsStatus (targetServerName, targetURL, function (targetStatus) {
                mobiusStatus = targetStatus;
                console.log("======== check-1 ========");
                console.log(mobiusStatus);

                callback(null, mobiusStatus);
            });
        },

        // Check the SPN IPE status
        function(targetStatus_1, callback) {

            var targetStatus_1 = targetStatus_1;

            // Following information has to be changed as SPN IPE info.
            var SpnStatus = '';
            targetServerName = 'SPNIPE';
            targetURL = 'http://localhost:7579/Mobius';

            retrieveComponentsStatus (targetServerName, targetURL, function (targetStatus) {
                SpnStatus = targetStatus;

                console.log("======== check-2 ========");
                console.log(targetStatus_1, SpnStatus);

                callback(null, targetStatus_1, SpnStatus);
            });
        },

        // Check the TTN IPE status
        function(targetStatus_1, targetStatus_2, callback) {
            var targetStatus_1 = targetStatus_1;
            var targetStatus_2 = targetStatus_2;

            // Following information has to be changed as TTN IPE info.
            var TtnStatus = '';
            targetServerName = 'TTNIPE';
            targetURL = 'http://localhost:7579/Mobius';

            retrieveComponentsStatus (targetServerName, targetURL, function (targetStatus) {
                TtnStatus = targetStatus;

                console.log("======== check-3 ========");
                console.log(targetStatus_1, targetStatus_2, TtnStatus);

                callback(null, targetStatus_1, targetStatus_2, TtnStatus);
            });
        }
    ], function (err, targetStatus_1, targetStatus_2, targetStatus_3) {
        if (err) {
            console.log('error')
        } else {
            var resultJSONObject = new Object();
            resultJSONObject.targetStatus_1 = targetStatus_1;
            resultJSONObject.targetStatus_2 = targetStatus_2;
            resultJSONObject.targetStatus_3 = targetStatus_3;

            response.status(200).send(resultJSONObject);
        }
    });
});

// Connecting the oneM2M Web Tester page.
loraWebIndex.get('/loraWebHome', function (request, response) {
    fs.readFile('loraWebHome.ejs', 'utf-8', function (error, data) {
        response.status(200).end(ejs.render(data));
    });
});

// Server start
http.createServer(loraWebIndex).listen(62590, function () {

    // // Check the LoRa IPE status + e-mail sending functionality
    // var heartBeat = setInterval(function() {
    //     var targetURL = "http://localhost:7591/loraipe";
    //
    //     requestToServer({
    //         url: targetURL,
    //         method: 'GET',
    //         json: true,
    //         headers: { // Basic AE resource structure for registration
    //             'Accept': 'application/json',
    //         }
    //     }, function (error, response, body) {
    //         if(typeof(response) !== 'undefined') {
    //             console.log("LoRa IPE server is running at http://localhost:7591")
    //         } else if (error) {
    //             console.log(error)
    //
    //             var transporter = nodemailer.createTransport({
    //                 service: 'gmail',
    //                 auth: {
    //                     user: process.env.EMAIL_ID,
    //                     pass: process.env.EMAIL_PWD
    //                 }
    //             });
    //
    //             var maillist = [
    //                 'forest62590@naver.com',
    //                 'forest62590@gmail.com',
    //             ];
    //
    //             // Getting the current IPE terminated time
    //             var newDate =  new Date();
    //             var currentTime = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
    //
    //             var mailOptions = {
    //                 from: 'forest625907@gmail.com',
    //                 to: maillist,
    //                 subject: 'LoRa IPE was terminated by unknown errors',
    //                 html: '<p>LoRa IPE was terminated at </p>' + '<p>' + currentTime + '</p>'
    //             };
    //
    //             transporter.sendMail(mailOptions, function(error, info){
    //                 if (error) {
    //                     console.log(error);
    //                 } else {
    //                     console.log('Email sent: ' + info.response);
    //                 }
    //             });
    //         }
    //     });
    // }, 10000);

    console.log('Server running port at ' + 'http://127.0.0.1:62590/lorawebhome');
});