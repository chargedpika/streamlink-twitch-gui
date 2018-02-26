import {
	get,
	set,
	computed,
	default as EmberObject
} from "@ember/object";
import ObjectProxy from "@ember/object/proxy";
import PromiseProxyMixin from "@ember/object/promise-proxy-mixin";
import SettingsSubmenuRoute from "./SettingsSubmenuRoute";
import InfiniteScrollMixin from "./mixins/infinite-scroll";
import preload from "utils/preload";


// build our own PromiseObject in order to avoid importing from a private ember-data module
// TODO: import from @ember-data/promise-proxies once it becomes available
const PromiseObject = ObjectProxy.extend( PromiseProxyMixin );


export default SettingsSubmenuRoute.extend( InfiniteScrollMixin, {
	controllerName: "settingsChannels",
	itemSelector: ".settings-channel-item-component",

	all: null,


	model() {
		const store = get( this, "store" );

		return store.findAll( "channelSettings" )
			.then( channelSettings => {
				// we need all channelSettings records, so we can search for specific ones
				// that have not been added to the controller's model yet
				this.all = channelSettings.map(function( record ) {
					// return both channelSettings and twitchChannel records
					return EmberObject.extend({
						settings: record,
						// load the twitchChannel record on demand (PromiseObject)
						// will be triggered by the first property read-access
						channel: computed(function() {
							const name = get( record, "id" );

							return PromiseObject.create({
								promise: store.findRecord( "twitchUser", name )
									.then( user => get( user, "channel" ) )
									.then( channel => preload( channel, "logo" ) )
							});
						})
					}).create();
				});
			})
			.then( () => this.fetchContent() );
	},

	fetchContent() {
		const limit = get( this, "limit" );
		const offset = get( this, "offset" );

		return Promise.resolve(
			this.all.slice( offset, offset + limit )
		);
	},

	setupController( controller ) {
		set( controller, "all", this.all );
		this._super( ...arguments );
	},

	deactivate() {
		this._super( ...arguments );
		this.all = null;
	}
});
