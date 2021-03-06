/**
 * @class Ext.util.GeoLocation
 * @extends Ext.util.Observable
 *
 * Provides a cross browser class for retrieving location information.<br/>
 * <br/>
 * Based on the <a href="http://dev.w3.org/geo/api/spec-source.html">Geolocation API Specification</a>.<br/>
 * If the browser does not implement that specification (Internet Explorer 6-8), it can fallback on Google Gears
 * as long as the browser has it installed, and the following javascript file from google is included on the page:
 * <pre><code>&lt;script type="text/javascript" src="http://code.google.com/apis/gears/gears_init.js"&gt;&lt;/script&gt;</code></pre>
 * <br/>
 * Note: Location implementations are only required to return timestamp, longitude, latitude, and accuracy.<br/>
 * Other properties (altitude, altitudeAccuracy, heading, speed) can be null or sporadically returned.<br/>
 * <br/>
 * When instantiated, by default this class immediately begins tracking location information, 
 * firing a {@link #locationupdate} event when new location information is available.  To disable this 
 * location tracking (which may be battery intensive on mobile devices), set {@link #autoUpdate} to false.<br/>
 * When this is done, only calls to {@link #updateLocation} will trigger a location retrieval.<br/>
 * <br/>
 * A {@link #locationerror} event is raised when an error occurs retrieving the location, either due to a user
 * denying the application access to it, or the browser not supporting it.<br/>
 * <br/>
 * The below code shows a GeoLocation making a single retrieval of location information.
 * <pre><code>
var geo = new Ext.util.GeoLocation({
    autoUpdate: false,
    listeners: {
        locationupdate: function (geo) {
            alert('New latitude: ' + geo.latitude);
        },
        locationerror: function (   geo,
                                    bTimeout, 
                                    bPermissionDenied, 
                                    bLocationUnavailable, 
                                    message) {
            if(bTimeout){
                alert('Timeout occurred.');
            }
            else{
                alert('Error occurred.');
            }
        }
    }
});
geo.updateLocation();</code></pre>
 */
Ext.util.GeoLocation = Ext.extend(Ext.util.Observable, {
    /**
     * @cfg {Boolean} autoUpdate
     * Defaults to true.<br/>
     * When set to true, continually monitor the location of the device
     * (beginning immediately) and fire {@link #locationupdate}/{@link #locationerror} events.<br/>
     * <br/>
     * When using google gears, if the user denies access or another error occurs, this will be reset to false.
     */
    autoUpdate: true,

    //Position interface
    /**
     * Read-only property representing the last retrieved 
     * geographical coordinate specified in degrees.
     * @type Number
     */
    latitude: null,
    /**
     * Read-only property representing the last retrieved 
     * geographical coordinate specified in degrees.
     * @type Number
     */
    longitude: null,
    /**
     * Read-only property representing the last retrieved 
     * accuracy level of the latitude and longitude coordinates, 
     * specified in meters.<br/>
     * This will always be a non-negative number.<br/>
     * This corresponds to a 95% confidence level.
     * @type Number
     */
    accuracy: null,
    /**
     * Read-only property representing the last retrieved 
     * height of the position, specified in meters above the ellipsoid
     * <a href="http://dev.w3.org/geo/api/spec-source.html#ref-wgs">[WGS84]</a>.
     * @type Number/null
     */
    altitude: null,
    /**
     * Read-only property representing the last retrieved 
     * accuracy level of the altitude coordinate, specified in meters.<br/>
     * If altitude is not null then this will be a non-negative number.
     * Otherwise this returns null.<br/>
     * This corresponds to a 95% confidence level.
     * @type Number/null
     */
    altitudeAccuracy: null,
    /**
     * Read-only property representing the last retrieved 
     * direction of travel of the hosting device, 
     * specified in non-negative degrees between 0 and 359, 
     * counting clockwise relative to the true north.<br/>
     * If speed is 0 (device is stationary), then this returns NaN
     * @type Number/null
     */
    heading: null,
    /**
     * Read-only property representing the last retrieved 
     * current ground speed of the device, specified in meters per second.<br/>
     * If this feature is unsupported by the device, this returns null.<br/>
     * If the device is stationary, this returns 0, 
     * otherwise it returns a non-negative number.
     * @type Number/null
     */
    speed: null,
    /**
     * Read-only property representing when the last retrieved 
     * positioning information was acquired by the device.
     * @type Date
     */
    timestamp: null,

    //PositionOptions interface
    /**
     * @cfg {Boolean} allowHighAccuracy
     * Defaults to false.<br/>
     * When set to true, provide a hint that the application would like to receive 
     * the best possible results. This may result in slower response times or increased power consumption. 
     * The user might also deny this capability, or the device might not be able to provide more accurate 
     * results than if this option was set to false.
     */
    allowHighAccuracy: false,
    
    /**
     * @cfg {Number} timeout
     * Defaults to Infinity.<br/>
     * The maximum number of milliseconds allowed to elapse between a location update operation
     * and the corresponding {@link #locationupdate} event being raised.  If a location was not successfully
     * acquired before the given timeout elapses (and no other internal errors have occurred in this interval),
     * then a {@link #locationerror} event will be raised indicating a timeout as the cause.<br/>
     * Note that the time that is spent obtaining the user permission is <b>not</b> included in the period 
     * covered by the timeout.  The timeout attribute only applies to the location acquisition operation.<br/>
     * In the case of calling updateLocation, the {@link #locationerror} event will be raised only once.<br/>
     * If {@link #autoUpdate} is set to true, the {@link #locationerror} event could be raised repeatedly.
     * The first timeout is relative to the moment {@link #autoUpdate} was set to true 
     * (or this {@link Ext.util.GeoLocation} was initialized with the {@link #autoUpdate} config option set to true).
     * Subsequent timeouts are relative to the moment when the device determines that it's position has changed.
     */
    timeout: Infinity,
    /**
     * @cfg {Number} maximumAge
     * Defaults to 0.<br/>
     * This option indicates that the application is willing to accept cached location information whose age 
     * is no greater than the specified time in milliseconds. If maximumAge is set to 0, an attempt to retrieve 
     * new location information is made immediately.<br/>
     * Setting the maximumAge to Infinity returns a cached position regardless of its age.<br/>
     * If the device does not have cached location information available whose age is no 
     * greater than the specified maximumAge, then it must acquire new location information.<br/>
     * For example, if location information no older than 10 minutes is required, set this property to 600000.
     */
    maximumAge: 0,
    /**
     * Changes the {@link #maximumAge} option and restarts any active 
     * location monitoring with the updated setting.
     * @param {Number} maximumAge The value to set the maximumAge option to.
     */
    setMaximumAge: function(maximumAge) {
        this.maximumAge = maximumAge;
        this.setAutoUpdate(this.autoUpdate);
    },
    /**
     * Changes the {@link #timeout} option and restarts any active 
     * location monitoring with the updated setting.
     * @param {Number} timeout The value to set the timeout option to.
     */
    setTimeout: function(timeout) {
        this.timeout = timeout;
        this.setAutoUpdate(this.autoUpdate);
    },
    /**
     * Changes the {@link #allowHighAccuracy} option and restarts any active 
     * location monitoring with the updated setting.
     * @param {Number} allowHighAccuracy The value to set the allowHighAccuracy option to.
     */
    setAllowHighAccuracy: function(allowHighAccuracy) {
        this.allowHighAccuracy = allowHighAccuracy;
        this.setAutoUpdate(this.autoUpdate);
    },
    
    //<deprecated since=0.99>
    setEnableHighAccuracy : function() {
        console.warn("GeoLocation: setEnableHighAccuracy has been deprecated. Please use setAllowHighAccuracy.");
        return this.setAllowHighAccuracy.apply(this, arguments);
    },
    //</deprecated>

    // private Object geolocation provider
    provider : null,
    // private Number tracking current watchPosition
    watchOperation : null,

    constructor : function(config) {
        Ext.apply(this, config);
        
        //<deprecated since=0.99>
        if (Ext.isDefined(this.enableHighAccuracy)) {
            console.warn("GeoLocation: enableHighAccuracy has been removed. Please use allowHighAccuracy.");
            this.allowHighAccuracy = this.enableHighAccuracy;
        }
        //</deprecated>

        this.coords = this; //@deprecated

        if (Ext.supports.GeoLocation) {
            this.provider = this.provider || 
                (navigator.geolocation ? navigator.geolocation : 
                (window.google || {}).gears ? google.gears.factory.create('beta.geolocation') : null);           
        }
        
        this.addEvents(
            /**
             * @private
             * @event update
             * @param {Ext.util.GeoLocation/False} coords
             * Will return false if geolocation fails (disabled, denied access, timed out).
             * @param {Ext.util.GeoLocation} this
             * @deprecated
             */
            'update',
            /**
             * @event locationerror
             * Raised when a location retrieval operation failed.<br/>
             * In the case of calling updateLocation, this event will be raised only once.<br/>
             * If {@link #autoUpdate} is set to true, this event could be raised repeatedly.
             * The first error is relative to the moment {@link #autoUpdate} was set to true 
             * (or this {@link Ext.util.GeoLocation} was initialized with the {@link #autoUpdate} config option set to true).
             * Subsequent errors are relative to the moment when the device determines that it's position has changed.
             * @param {Ext.util.GeoLocation} this
             * @param {Boolean} timeout
             * Boolean indicating a timeout occurred
             * @param {Boolean} permissionDenied
             * Boolean indicating the user denied the location request
             * @param {Boolean} locationUnavailable
             * Boolean indicating that the location of the device could not be determined.<br/>
             * For instance, one or more of the location providers used in the location acquisition 
             * process reported an internal error that caused the process to fail entirely.
             * @param {String} message
             * An error message describing the details of the error encountered.<br/>
             * This attribute is primarily intended for debugging and should not be used 
             * directly in an application user interface.
             */
            'locationerror',
            /**
             * @event locationupdate
             * Raised when a location retrieval operation has been completed successfully.
             * @param {Ext.util.GeoLocation} this
             * Retrieve the current location information from the GeoLocation object by using the read-only 
             * properties latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, and speed.
             */
            'locationupdate'
        );

        Ext.util.GeoLocation.superclass.constructor.call(this);

        if(this.autoUpdate){
            var me = this;
            setTimeout(function(){
                me.setAutoUpdate(me.autoUpdate);
            }, 0);
        }
    },

    /**
     * Enabled/disables the auto-retrieval of the location information.<br/>
     * If called with autoUpdate=true, it will execute an immediate location update
     * and continue monitoring for location updates.<br/>
     * If autoUpdate=false, any current location change monitoring will be disabled.
     * @param {Boolean} autoUpdate Whether to start/stop location monitoring.
     * @return {Boolean} If enabling autoUpdate, returns false if the location tracking 
     * cannot begin due to an error supporting geolocation.
     * A locationerror event is also fired.
     */
    setAutoUpdate : function(autoUpdate) {
        if (this.watchOperation !== null) {
            this.provider.clearWatch(this.watchOperation);
            this.watchOperation = null;
        }
        if (!autoUpdate) {
            return true;
        }
        if (!Ext.supports.GeoLocation) {
            this.fireEvent('locationerror', this, false, false, true, null);
            return false;
        }
        try{
            this.watchOperation = this.provider.watchPosition(
                Ext.createDelegate(this.fireUpdate, this), 
                Ext.createDelegate(this.fireError, this), 
                this.parseOptions());
        }
        catch(e){
            this.autoUpdate = false;
            this.fireEvent('locationerror', this, false, false, true, e.message);
            return false;
        }
        return true;
    },

    /**
     * Executes a onetime location update operation, 
     * raising either a {@link #locationupdate} or {@link #locationerror} event.<br/>
     * Does not interfere with or restart ongoing location monitoring.
     * @param {Function} callback
     * A callback method to be called when the location retrieval has been completed.<br/>
     * Will be called on both success and failure.<br/>
     * The method will be passed one parameter, {@link Ext.GeoLocation} (<b>this</b> reference),
     * set to null on failure.
     * <pre><code>
geo.updateLocation(function (geo) {
    alert('Latitude: ' + (geo != null ? geo.latitude : 'failed'));
});
</code></pre>
     * @param {Object} scope (optional)
     * (optional) The scope (<b>this</b> reference) in which the handler function is executed.
     * <b>If omitted, defaults to the object which fired the event.</b>
     * <!--positonOptions undocumented param, see W3C spec-->
     */
    updateLocation : function(callback, scope, positionOptions) {
        var me = this;

        var failFunction = function(message, error){
            if(error){
                me.fireError(error);
            }
            else{
                me.fireEvent('locationerror', me, false, false, true, message);
            }
            if(callback){
                callback.call(scope || me, null, me); //last parameter for legacy purposes
            }
            me.fireEvent('update', false, me); //legacy, deprecated
        };

        if (!Ext.supports.GeoLocation) {
            setTimeout(function() {
                failFunction(null);
            }, 0);
            return;
        }

        try{
            this.provider.getCurrentPosition(
                //success callback
                function(position){
                    me.fireUpdate(position);
                    if(callback){
                        callback.call(scope || me, me, me); //last parameter for legacy purposes
                    }
                    me.fireEvent('update', me, me); //legacy, deprecated
                },
                //error callback
                function(error){
                    failFunction(null, error);
                },
                positionOptions ? positionOptions : this.parseOptions());
        }
        catch(e){
            setTimeout(function(){
                failFunction(e.message);
            }, 0);
        }
    },

    // private
    fireUpdate: function(position){
        this.timestamp = position.timestamp;
        this.latitude = position.coords.latitude;
        this.longitude = position.coords.longitude;
        this.accuracy = position.coords.accuracy;
        this.altitude = position.coords.altitude;
        this.altitudeAccuracy = position.coords.altitudeAccuracy;
        
        //google doesn't provide these two
        this.heading = typeof position.coords.heading == 'undefined' ? null : position.coords.heading;
        this.speed = typeof position.coords.speed == 'undefined' ? null : position.coords.speed;
        this.fireEvent('locationupdate', this);
    },
    fireError: function(error){
        this.fireEvent('locationerror', this,
            error.code == error.TIMEOUT, 
            error.code == error.PERMISSION_DENIED, 
            error.code == error.POSITION_UNAVAILABLE,
            error.message == undefined ? null : error.message);
    },
    parseOptions: function(){
        var ret = { 
            maximumAge: this.maximumAge, 
            allowHighAccuracy: this.allowHighAccuracy
        };
        //Google doesn't like Infinity
        if(this.timeout !== Infinity){
            ret.timeout = this.timeout;
        }
        return ret;
    },

    /**
     * @private
     * Returns cached coordinates, and updates if there are no cached coords yet.
     * @deprecated
     */
    getLocation : function(callback, scope) {
        var me = this;
        if(this.latitude !== null){
            callback.call(scope || me, me, me);
        }
        else {
            me.updateLocation(callback, scope);
        }
    }
});