import Graph, {Attributes} from 'graphology-types';
import {ForceAtlas2LayoutParameters} from './index';

export default class FA2LayoutSupervisor<
  NodeAttributes extends Attributes = Attributes,
  EdgeAttributes extends Attributes = Attributes
> {
  constructor(
    graph: Graph,
    params?: ForceAtlas2LayoutParameters<NodeAttributes, EdgeAttributes>
  );

  isRunning(): boolean;
  start(): void;
  stop(): void;
  kill(): void;
}
