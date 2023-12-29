import visual_interface from "./lib/visual_interface.js";

// Network
let nodes = ["A", "B", "C", "D", "E", "F", "G"];
let edges = [
	{
		nodes: ["A", "B"],
		cost: 3,
	},
	{
		nodes: ["A", "C"],
		cost: 1,
	},
	{
		nodes: ["A", "D"],
		cost: 2,
	},
	{
		nodes: ["B", "E"],
		cost: 3,
	},
	{
		nodes: ["B", "F"],
		cost: 1,
	},
	{
		nodes: ["C", "G"],
		cost: 2,
	},
	{
		nodes: ["D", "G"],
		cost: 3,
	},
	{
		nodes: ["E", "G"],
		cost: 1,
	},
	{
		nodes: ["F", "G"],
		cost: 2,
	},
];
let tables = [];
let vector_passes = [];

// ======================== Initialization ========================
// Graphs the network
visual_interface.graph_network(nodes, edges);

// Fills each node tables (routing and vectors) with the nodes and edges
nodes.forEach((node) => {
	let vectors_table = [];

	// Initialize the table
	nodes.forEach((innerNode) => {
		vectors_table[innerNode] = {};
		nodes.forEach((columnNode) => {
			vectors_table[innerNode][columnNode] = innerNode === node && columnNode === node ? 0 : Number.POSITIVE_INFINITY;
		});
	});

	// Fills the cost to neighbors
	let filteredEdges = edges.filter((edge) => edge.nodes.includes(node));
	filteredEdges.forEach((edge) => {
		const [source, target] = edge.nodes;
		if (source == node) {
			vectors_table[source][target] = edge.cost;
		} else {
			vectors_table[target][source] = edge.cost; // Include this line for bidirectional edges
		}
	});
	
	// Fills the routing table
	let routing_table = {};
	nodes.forEach((innerNode) => {
		routing_table[innerNode] = vectors_table[node][innerNode] === Number.POSITIVE_INFINITY ? '-' : innerNode;
	});

	tables.push({ table_node: node, vectors_table, routing_table });
});

// Graphs each node table
visual_interface.graph_tables(tables, nodes);

function deep_copy(object) {
	let copy = Array.isArray(object) ? [] : {};
	for (let key in object) {
		let v = object[key];
		if (v) {
			if (typeof v === "object") {
				copy[key] = deep_copy(v);
			} else {
				copy[key] = v;
			}
		} else {
			copy[key] = v;
		}
	}
	return copy;
}

visual_interface.edges_forms(edges, nodes);

// ======================== Interfaces Provided to Nodes ========================
// Sends the vector to the neighbors of the node
function broadcast_vector (vector, node) {
	let neighbors = edges.filter((edge) => edge.nodes.includes(node));
	neighbors.forEach((neighbor) => {
		let neighbor_node = neighbor.nodes.find((neighbor_node) => neighbor_node !== node);
		let packaged_vector = {
			from: node,
			to: neighbor_node,
			date: Date.now(),
			vector: deep_copy(vector),
		}
		vector_passes.push(packaged_vector);
		visual_interface.edge_send(node, neighbor_node);
	});
}

// Receives the vectors sent to the node
function recv_vector (node) {
	let recv_vectors = vector_passes.filter(packaged_vector => packaged_vector.to === node);
	vector_passes = vector_passes.filter(packaged_vector => packaged_vector.to !== node);
	return recv_vectors;
}

// Updates the vectors of the node table
function update_vectors (vectors_table, vectors, node) {
	vectors.forEach((packaged_vector) => {
		let neighbor_node = packaged_vector.from;
		let neighbor_vector = packaged_vector.vector;
		vectors_table[neighbor_node] = neighbor_vector;
		visual_interface.update_vector(node, neighbor_node, neighbor_vector);
	});
}

function discard_repeated_old_vectors(vectors) {
    const uniqueVectors = {};

    vectors.forEach((vector) => {
        const existingVector = uniqueVectors[vector.from];

        if (!existingVector || existingVector.date < vector.date) {
            uniqueVectors[vector.from] = vector;
        }
    });

    // Convert the object back to an array
    const filteredVectors = Object.values(uniqueVectors);

    return filteredVectors;
}

// Gives the table of the node
function get_my_vectors_table (node) {
	return tables.find((vectors_table) => vectors_table.table_node === node).vectors_table;
}

function get_my_routing_table (node) {
	return tables.find((routing_table) => routing_table.table_node === node).routing_table;
}

// Updates the node vector applying the Bellman-Ford equation (returns True when the vector has changed)
function bellman_ford_equation(vectors_table, node, routing_table) {
	const targets_nodes = Object.keys(vectors_table[node]).filter(targetNode => targetNode !== node);
	const before_vector = deep_copy(vectors_table[node]);

	targets_nodes.forEach((target_node) => {
		if (target_node !== node) {
			// Find the intermediate node that results in the minimum distance
			let minIntermediateNode = routing_table[target_node];
			let minDistance = Number.POSITIVE_INFINITY;

			targets_nodes.forEach((intermediate_node) => {
				const distance = vectors_table[node][intermediate_node] + vectors_table[intermediate_node][target_node];
				if (distance < minDistance) {
					minDistance = distance;
					minIntermediateNode = intermediate_node;
				}
			});

			// Update the table with the minimum distance
			vectors_table[node][target_node] = Math.min(vectors_table[node][target_node], minDistance);
			
			// Update the intermediate nodes object
			routing_table[target_node] = minIntermediateNode;
		}
	});

	return JSON.stringify(before_vector) !== JSON.stringify(vectors_table[node]);
}

// ======================== DV Algorithm ========================
document.getElementById("start_dv_algorithm").addEventListener("click", () => {
    nodes.forEach((node, index) => {
        setTimeout(() => {
            broadcast_vector(get_my_vectors_table(node)[node], node);
        }, 1000 * index); // Use index to stagger the timeouts
    });
	document.getElementById("start_dv_algorithm").style.display = "none";
	document.getElementById("reset_button").style.display = "block";
	document.getElementById("run_next_node").style.display = "block";
});

let actual_node = 0;
document.getElementById("run_next_node").addEventListener("click", () => {
	let node = nodes[actual_node];

	let vectors_table = get_my_vectors_table(node);
	let routing_table = get_my_routing_table(node);

	visual_interface.focus_table(node);

	// Receive vectors from neighbors
	let recv_vectors = recv_vector(node);

	// Update vectors
	update_vectors(vectors_table, discard_repeated_old_vectors(recv_vectors), node);

	let send_vector = bellman_ford_equation(vectors_table, node, routing_table);

	setTimeout(() => {
		if(send_vector) {
			visual_interface.update_vector(node, node, vectors_table[node]);
			visual_interface.update_routing_table(node, routing_table);
			// Broadcast vector to neighbors
			setTimeout(() => {
				broadcast_vector(vectors_table[node], node);
			}, 800);
		}
	}, 1200);

	actual_node = (actual_node + 1) % nodes.length;
	document.getElementById("run_next_node").innerHTML = "Run node: " + nodes[actual_node];
});

// ======================== Extra ========================
let modify_edges_form = false;
document.getElementById("modify_edges_forms").addEventListener("click", () => {
	if(modify_edges_form) {
		document.getElementById("full_screen").style.display = "none";
		modify_edges_form = false;
	} else {
		document.getElementById("full_screen").style.display = "block";
		modify_edges_form = true;
	}
});