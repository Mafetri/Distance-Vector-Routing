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

// Fills each node table with the nodes and edges
nodes.forEach((node) => {
	let table = [];

	nodes.forEach((innerNode) => {
		table[innerNode] = {};
		nodes.forEach((columnNode) => {
			table[innerNode][columnNode] = innerNode === node && columnNode === node ? 0 : Number.POSITIVE_INFINITY;
		});
	});

	let filteredEdges = edges.filter((edge) => edge.nodes.includes(node));
	filteredEdges.forEach((edge) => {
		const [source, target] = edge.nodes;
		if (source == node) {
			table[source][target] = edge.cost;
		} else {
			table[target][source] = edge.cost; // Include this line for bidirectional edges
		}
	});
	tables.push({ table_node: node, table });
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
function update_vectors (table, vectors, node) {
	vectors.forEach((packaged_vector) => {
		let neighbor_node = packaged_vector.from;
		let neighbor_vector = packaged_vector.vector;
		table[neighbor_node] = neighbor_vector;
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
function get_my_table (node) {
	return tables.find((table) => table.table_node === node).table;
}

// Updates the node vector applying the Bellman-Ford equation (returns True when the vector has changed)
function bellman_ford_equation(table, node) {
	const targets_nodes = Object.keys(table[node]);
	const before_vector = deep_copy(table[node]);
	targets_nodes.forEach((target_node) => {
		if (target_node !== node) {
			// Min of the actual cost to the target node and the cost of the minimum other path cost to the target node
			table[node][target_node] = Math.min(
				// Actual cost to target node
				table[node][target_node],
				// Minimum other path cost to target node
				targets_nodes.reduce((accumulative_min_distance, intermediate_node) => {
					// Minimum distance between the last min distance and the sum of the distance from the node to the
					// intermediate node and the distance from the intermediate node to the target node
					return Math.min(
						accumulative_min_distance,
						table[node][intermediate_node] + table[intermediate_node][target_node],
					);
				}, table[node][target_node]),
			);
		}
	});
	return JSON.stringify(before_vector) !== JSON.stringify(table[node]);
}

// ======================== DV Algorithm ========================
document.getElementById("start_dv_algorithm").addEventListener("click", () => {
    nodes.forEach((node, index) => {
        setTimeout(() => {
            broadcast_vector(get_my_table(node)[node], node);
        }, 1000 * index); // Use index to stagger the timeouts
    });
	document.getElementById("start_dv_algorithm").style.display = "none";
	document.getElementById("run_next_node").style.display = "block";
});

let actual_node = 0;
document.getElementById("run_next_node").addEventListener("click", () => {
	let node = nodes[actual_node];

	visual_interface.focus_table(node);

	// Receive vectors from neighbors
	let recv_vectors = recv_vector(node);

	// Update vectors
	update_vectors(get_my_table(node), discard_repeated_old_vectors(recv_vectors), node);

	let my_table = get_my_table(node);
	let send_vector = bellman_ford_equation(my_table, node);
	
	setTimeout(() => {
		if(send_vector) {
			visual_interface.update_vector(node, node, my_table[node]);
			// Broadcast vector to neighbors
			setTimeout(() => {
				broadcast_vector(get_my_table(node)[node], node);
			}, 800);
		}
	}, 1200);

	actual_node = (actual_node + 1) % nodes.length;
	document.getElementById("run_next_node").innerHTML = "Run node: " + nodes[actual_node];
});