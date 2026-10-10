import {DurableObject} from 'cloudflare:workers';
import {connect} from 'cloudflare:sockets';
import {createGpsTransport} from './gps-tls-transport.mjs';
import gateway,{GpsFeedCoordinator} from './gps-feed-coordinator.mjs';

export class SharedGpsFeeds extends DurableObject{
  constructor(ctx,env){super(ctx,env);this.coordinator=new GpsFeedCoordinator(ctx,env,createGpsTransport(connect))}
  fetch(request){return this.coordinator.fetch(request)}
}
export default gateway;
