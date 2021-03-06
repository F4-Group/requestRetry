var request = require('request');
var _ = require('underscore');
_.str = require('underscore.string');
var MAX_RETRY = 3;

module.exports = function (options, callback) {
    if (_.isString(options))
        options = {url: options};
    var url = options.url || options.uri;
    var logger = options.logger || console;
    var leftRetries = options.maxRetry || MAX_RETRY;
    var requestFunction = function (options, callback) {
        if (leftRetries <= 0) {
            callback(requestError("maxRetry reached, give up"));
            return;
        }

        request(options, function (error, response, body) {
            if (error) {
                if (error.code == 'ECONNRESET') {
                    logger.info("Connection reset on ", url, " trying again");
                    retry();
                } else {
                    callback(requestError(error));
                }
            } else if (response.statusCode == 200) {
                callback(null, body);
            } else if (response.statusCode == 500 && _.str.contains(body, "Timeout")) {
                logger.info({message: "Timeout, trying again", url: url, options: options, body: body});
                retry();
            } else if (response.statusCode == 503) {
                logger.info({message: "503, trying again", url: url, options: options, body: body});
                retry();
            } else {
                callback(requestError(response.statusCode + " : " + body));
            }
        });
    };

    function retry() {
        leftRetries--;
        requestFunction(options, callback);
    }

    function requestError(error, message) {
        if (error instanceof Error) {
            return error;
        } else {
            message = message || "Error";
            logger.error({message: message, url: url, options: options, error: error});
            return new Error(message + " on " + url);
        }
    }

    requestFunction(options, callback);
};