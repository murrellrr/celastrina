# celastrina
Celastrina is a JavaScript framework for simplifying server-less compute in Microsoft Azure Functions. Celastrina
attempts to simplify the configuration and connectivity of common PaaS services in the Azure Platform with a special
emphasis on security.

Celastrina is flexible enough to support small open-source efforts and can easily scale up to large enterprise
deployments. Celastrina is committed to maintaining compatibility with JavaScript libraries released by Microsoft and
will continue to adapt and grow with the Microsoft Azure eco-system.

# Quick Start
Creating your first Timer Function:

```
const {LOG_LEVEL, CelastrinaError, Configuration} = require(“@celastrina/core”);
const {TickEvent, TimerFunction, TimerAddOn} = require(“@celastrina/timer”);

class MyFirstFunction extends TimerFunction {
    constructor(config) {
        super(config);
    } 

    async onTick(event) {
        // Successfule tick event!
		event.context.log("Welcome!", LOG_LEVEL.INFO);
		//event.reject(CelastrinaError.newError("Something Happened!")); // to reject the tick.
	}
	
	async onReject(event) {
	    // Rejected tick event.
		this.onRejectInvoked = true;
	}
	
	async onAbort(event) {
	    // Aborted event. Typically when an excepin happens or TimerAddOn.abortOnReject = true.
	}
}
 
const _config = new Configuration(“MyFirstFunction”);
const _timerconfig = new TimerAddOn();
_config.addOn(_timerconfig);
module.exports = new MyFirstFunction (_config);
```

You will need to make a few updates to your function.json. You’ll need to add an “entryPoint” attribute with the value “execute” and ensure your in binding is named “tick”.

```
{
    “entryPoint”: “execute”,
    "bindings": [
        {
           "name": "tick",
           "type": "timerTrigger",
           "direction": "in",
           "schedule": "0 */5 * * * *"
        }
    ]
}
```

Please visit [celastrinajs.com](https://www.celastrinajs.com) for further examples and documentation.
