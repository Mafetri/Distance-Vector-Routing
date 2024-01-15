import visual_interface from "./lib/visual_interface.js";
import topologies from "./topologies/dv_algorithm.json" assert { type: "json" };

// ======================== Global Variables ========================
let topology;
let nodes = [];
let edges = [];
let tables = [];
let vector_passes = [];
let link_cost_update = [];
let poisoned_vectors = [];
let poison_reverse = false;

// ======================== Initialization ========================

// Selects the topology
visual_interface.topology_selection(topologies);
document.querySelectorAll(".topology_button").forEach((button) => {
	button.addEventListener("click", (event) => {
		const clicked_button_id = event.target.id;
		topology = topologies[clicked_button_id];
		nodes = topology.nodes;
		edges = topology.edges;

		// Graphs the network
		visual_interface.graph_network(nodes, edges);

		// Fills the tables
		initialize_tables();

		// Graphs each node table
		visual_interface.graph_tables(tables, nodes);

		// Graphs the edges forms
		visual_interface.edges_forms(edges, nodes);
		modify_edges_forms();

		// Graphs the nodes forms
		visual_interface.node_form(nodes);
		delete_node_form();

		add_node_form();

		// Hide the topology selection
		document.getElementById("topologies_full_screen").style.display = "none";
	});
});

// Initialize the tables of the nodes
function initialize_tables() {
	nodes.forEach((node) => {
		initialize_node(node);
	});
}

// Initialize the table of the node
function initialize_node(node) {
	let vectors_table = [];
	let routing_table = {};

	vectors_table[node] = {};

	let neighbors = get_neighbors(node);
	neighbors.forEach((neighbor) => {
		const cost = get_direct_cost(node, neighbor);
		vectors_table[node][neighbor] = cost;
		routing_table[neighbor] = neighbor;
	});

	vectors_table[node][node] = 0;
	routing_table[node] = node;

	tables.push({ table_node: node, vectors_table, routing_table });
}

// ======================== Interfaces Provided to Nodes ========================

// Sends the same vector to all the neighbors of the node
function broadcast_vector(vector, node) {
	let neighbors = edges.filter((edge) => edge.nodes.includes(node));
	neighbors.forEach((neighbor) => {
		let neighbor_node = neighbor.nodes.find((neighbor_node) => neighbor_node !== node);
		send_vector(vector, node, neighbor_node);
	});
}

// Sends the vector to the destination_node
function send_vector(vector, node, destination_node) {
	let packaged_vector = {
		from: node,
		to: destination_node,
		date: Date.now(),
		vector: deep_copy(vector),
	};
	vector_passes.push(packaged_vector);
	visual_interface.edge_send(node, destination_node);
}

// Sends the vectors (poisoned or not) to the neighbors of the node
function send_vectors(node, vector, poisoned_vector_passes) {
	let neighbors = edges.filter((edge) => edge.nodes.includes(node));
	neighbors = neighbors.filter(
		(neighbor) =>
			poisoned_vector_passes.find(
				(packaged_vector) => packaged_vector.to === neighbor.nodes.find((neighbor_node) => neighbor_node !== node),
			) === undefined,
	);
	neighbors.forEach((neighbor) => {
		let neighbor_node = neighbor.nodes.find((neighbor_node) => neighbor_node !== node);
		send_vector(vector, node, neighbor_node);
	});

	poisoned_vector_passes.forEach((packaged_vector) => {
		send_vector(packaged_vector.vector, node, packaged_vector.to);
	});
}

// Receives the vectors sent to the node
function recv_vector(node) {
	let recv_vectors = vector_passes.filter((packaged_vector) => packaged_vector.to === node);
	vector_passes = vector_passes.filter((packaged_vector) => packaged_vector.to !== node);
	return recv_vectors;
}

// Gives the table of the node
function get_my_vectors_table(node) {
	return tables.find((vectors_table) => vectors_table.table_node === node).vectors_table;
}

// Return the routing table of the node
function get_my_routing_table(node) {
	return tables.find((routing_table) => routing_table.table_node === node).routing_table;
}

// Returns the cost of the edge between the node and the target_node, if there is no edge, returns Infinity
function get_direct_cost(node, target_node) {
	const edge = edges.find((edge) => edge.nodes.includes(node) && edge.nodes.includes(target_node));
	return edge === undefined ? Number.POSITIVE_INFINITY : edge.cost;
}

// Returns the neighbors of the node
function get_neighbors(node) {
	const node_edges = edges.filter((edge) => edge.nodes.includes(node));
	return node_edges.map((edge) => edge.nodes.find((neighbor) => neighbor !== node));
}

// Returns the poisoned vectors of the node to be send
function get_nodes_poisoned(node) {
	let poisoned_vectors_node = poisoned_vectors.filter((packaged_vector) => packaged_vector.from === node);
	poisoned_vectors = poisoned_vectors.filter((packaged_vector) => packaged_vector.from !== node);
	return poisoned_vectors_node;
}

// Returns true if the link has changed
function link_has_changed(from, to) {
	let link_updates = link_cost_update.length;
	link_cost_update = link_cost_update.filter((link) => link.from !== from || link.to !== to);
	return link_updates > link_cost_update.length;
}

// ======================== DV Algorithm ========================
// Start the DV algorithm (initial broadcast)
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

// Node execution after initialization broadcast
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
		if (send_vector) {
			visual_interface.update_vector(node, node, vectors_table[node]);
			visual_interface.update_routing_table(node, routing_table);
			// Broadcast vector to neighbors
			setTimeout(() => {
				send_vectors(node, vectors_table[node], get_nodes_poisoned(node));
			}, 800);
		}
	}, 1200);

	actual_node = (actual_node + 1) % nodes.length;
	document.getElementById("run_next_node").innerHTML = "Run node: " + nodes[actual_node];
});

// Updates the node vector applying the Bellman-Ford equation (returns True when the vector has changed)
function bellman_ford_equation(vectors_table, node, routing_table) {
	const targets_nodes = Object.keys(vectors_table[node]).filter((targetNode) => targetNode !== node);
	const before_vector = deep_copy(vectors_table[node]);
	const neighbors = get_neighbors(node);
	let nodes_to_lie = [];

	targets_nodes.forEach((target_node) => {
		if (target_node !== node) {
			// Find the intermediate node that results in the minimum distance
			let min_intermediate_node = "";
			let min_distance = Number.POSITIVE_INFINITY;

			// For each neighbor, calculate the distance to the target node (D_neighbor(target) + c(node, neighbor)) and find the minimum
			neighbors.forEach((neighbor) => {
				if (!vectors_table[neighbor]) return;
				const distance = get_direct_cost(node, neighbor) + vectors_table[neighbor][target_node];
				if (distance < min_distance) {
					min_distance = distance;
					min_intermediate_node = neighbor;
				}
			});

			// Update the table with the minimum distance
			vectors_table[node][target_node] = min_distance;

			// Poison reverse
			if (poison_reverse) {
				// If the current total cost to the target is grater than the last time, then poison the link
				let current_intermediate_node = routing_table[target_node];
				// If there is a link change to the actual next hop and the node has chosen another next hop node, then poison the link
				if (link_has_changed(node, current_intermediate_node) && current_intermediate_node !== min_intermediate_node) {
					// Saves the node to lie
					nodes_to_lie.push({
						to: min_intermediate_node,
						target: target_node,
					});
				}
			}

			// Update the intermediate nodes object
			routing_table[target_node] = min_intermediate_node;
		}
	});

	// Now that the vector is completely updated, poison the vector send to the nodes_to_lie nodes
	nodes_to_lie.forEach((node_to_lie) => {
		let poisoned_vector = deep_copy(vectors_table[node]);
		poisoned_vector[node_to_lie.target] = Number.POSITIVE_INFINITY;

		poisoned_vectors.push({
			from: node,
			to: node_to_lie.to,
			vector: poisoned_vector,
		});
	});

	return JSON.stringify(before_vector) !== JSON.stringify(vectors_table[node]);
}

// ======================== Extra ========================
// Discards the repeated vectors (keeps the newest)
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

// From the table given, returns an array with all the nodes involved in the table
function extract_nodes(table) {
	const nodes = [];
	for (const node in table) {
		if (typeof table[node] === "object") {
			nodes.push(...extract_nodes(table[node])); // Recursively extract keys from nested objects
		} else {
			nodes.push(node);
		}
	}
	return nodes;
}

// If the received vector has more nodes than the vector of the node, then add the missing nodes with Infinity cost
function increase_vector(table_node, table) {
	const nodes = [...new Set(extract_nodes(table))];
	nodes.forEach((node) => {
		if (!table[table_node].hasOwnProperty(node)) {
			table[table_node][node] = Number.POSITIVE_INFINITY; // Add missing keys with Infinity value
		}
	});
}

// Updates the vectors of the node table
function update_vectors(vectors_table, vectors, node) {
	vectors.forEach((packaged_vector) => {
		let neighbor_node = packaged_vector.from;
		let neighbor_vector = packaged_vector.vector;
		vectors_table[neighbor_node] = neighbor_vector;
		increase_vector(node, vectors_table);
	});
	visual_interface.update_table(node, vectors_table, vectors);
}

// Deep copy a object
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

// ======================== Forms ========================
// ---- Modify Edges ----
// Modify edges form button
let modify_edges_form = false;
document.getElementById("modify_edges_forms").addEventListener("click", () => {
	if (modify_edges_form) {
		document.getElementById("full_screen").style.display = "none";
		modify_edges_form = false;
	} else {
		document.getElementById("full_screen").style.display = "block";
		modify_edges_form = true;
	}
});

// Modify edges form
function modify_edges_forms() {
	document.querySelectorAll(".change_edge_form").forEach((form) => {
		form.addEventListener("submit", (event) => {
			event.preventDefault(); // Prevent default form submission
			const action = event.submitter.value; // Get the action (modify or delete)

			if (action === "modify") {
				const new_cost = parseInt(form.querySelector("input[name='cost']").value);

				// Find the corresponding edge in the edges array and update its cost
				const form_nodes = form.querySelectorAll("p");
				const edge_index = edges.findIndex(
					(edge) =>
						(edge.nodes[0] === form_nodes[0].textContent && edge.nodes[1] === form_nodes[1].textContent) ||
						(edge.nodes[0] === form_nodes[1].textContent && edge.nodes[1] === form_nodes[0].textContent),
				);

				if (edge_index !== -1) {
					link_cost_update.push({
						from: form_nodes[0].textContent,
						to: form_nodes[1].textContent,
						old_cost: edges[edge_index].cost,
						new_cost: new_cost,
					});
					link_cost_update.push({
						from: form_nodes[1].textContent,
						to: form_nodes[0].textContent,
						old_cost: edges[edge_index].cost,
						new_cost: new_cost,
					});
					edges[edge_index].cost = new_cost;
					visual_interface.update_edge(edges[edge_index]);
				}
			} else if (action === "delete") {
				const new_cost = Number.POSITIVE_INFINITY;
				// Find the corresponding edge in the edges array and remove it
				const form_nodes = form.querySelectorAll("p");
				const edge_index = edges.findIndex(
					(edge) =>
						(edge.nodes[0] === form_nodes[0].textContent && edge.nodes[1] === form_nodes[1].textContent) ||
						(edge.nodes[0] === form_nodes[1].textContent && edge.nodes[1] === form_nodes[0].textContent),
				);
				if (edge_index !== -1) {
					link_cost_update.push({
						from: form_nodes[0].textContent,
						to: form_nodes[1].textContent,
						old_cost: edges[edge_index].cost,
						new_cost: new_cost,
					});
					link_cost_update.push({
						from: form_nodes[1].textContent,
						to: form_nodes[0].textContent,
						old_cost: edges[edge_index].cost,
						new_cost: new_cost,
					});
					edges[edge_index].cost = new_cost;
					form.remove();
					visual_interface.update_edge(edges[edge_index]);
				}
			}
		});
	});
}

// Poison reverse selector
const poison_reverse_selector = document.getElementById("poison_reverse");
poison_reverse_selector.addEventListener("change", () => {
	poison_reverse = poison_reverse_selector.value;
});

// ---- Add/Delete Node ----
// Add/Delete node form button
let modify_node_form = false;
document.getElementById("modify_nodes_forms").addEventListener("click", () => {
	if (modify_node_form) {
		document.getElementById("nodes_forms_full_screen").style.display = "none";
		modify_node_form = false;
	} else {
		document.getElementById("nodes_forms_full_screen").style.display = "block";
		modify_node_form = true;
	}
});

// Delete node form
function delete_node_form() {
	document.getElementById("delete_node_form").addEventListener("submit", (event) => {
		event.preventDefault(); // Prevent default form submission
		const node = event.target.querySelector("select[name='node_name']").value;

		// Finds all the edges and notifies all the nodes involved that the node is not reachable
		let node_edges = edges.filter((edge) => edge.nodes.includes(node));
		node_edges.forEach((edge) => {
			link_cost_update.push({
				from: edge.nodes[0],
				to: edge.nodes[1],
				old_cost: edge.cost,
				new_cost: Number.POSITIVE_INFINITY,
			});
			link_cost_update.push({
				from: edge.nodes[1],
				to: edge.nodes[0],
				old_cost: edge.cost,
				new_cost: Number.POSITIVE_INFINITY,
			});
			edge.cost = Number.POSITIVE_INFINITY;
			visual_interface.update_edge(edge);
		});

		// Removes the node
		nodes = nodes.filter((node_name) => node_name !== node);
		edges = edges.filter((edge) => !edge.nodes.includes(node));
		tables = tables.filter((table) => table.table_node !== node);
	});
}

// Add node form
function add_node_form() {
	document.getElementById("add_node_form").addEventListener("submit", (event) => {
		event.preventDefault(); // Prevent default form submission

		// Gets the name of the new node
		const node = event.target.querySelector("input[name='node_name']").value;
		nodes.push(node);

		// Gets the edges of the new node
		let node_edges = event.target.querySelector("input[name='node_edges']").value;
		node_edges = node_edges.split(",");

		// Saves the new edges
		node_edges.forEach((edge) => {
			edges.push({
				nodes: [node, edge.split(":")[0]],
				cost: parseInt(edge.split(":")[1]),
			});
		});

		// Initialize the node
		initialize_node(node);

		// Graph the new node
		visual_interface.add_node(node, get_my_vectors_table(node), get_my_routing_table(node));
		visual_interface.update_network(nodes, edges);
		visual_interface.edges_forms(edges, nodes);

		// Broadcast its vector as normal
		broadcast_vector(get_my_vectors_table(node)[node], node);
	});
}
