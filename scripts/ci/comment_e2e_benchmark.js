// Given a local benchmark json aggregated file, reformats it in markdown
// and comments on the PR that prompted it. If the CI is rerun, the comment
// is updated.

const https = require("https");
const fs = require("fs");

const GITHUB_TOKEN = process.env.AZTEC_BOT_COMMENTER_GITHUB_TOKEN;
const OWNER = "AztecProtocol";
const REPO = "aztec3-packages";
const COMMENT_MARK = "<!-- AUTOGENERATED BENCHMARK COMMENT -->";

const {
  ROLLUP_SIZES,
  BLOCK_SIZE,
  BENCHMARK_FILE_JSON,
  L1_ROLLUP_CALLDATA_SIZE_IN_BYTES,
  L1_ROLLUP_CALLDATA_GAS,
  L1_ROLLUP_EXECUTION_GAS,
  L2_BLOCK_PROCESSING_TIME,
  CIRCUIT_SIMULATION_TIME,
  CIRCUIT_INPUT_SIZE,
  CIRCUIT_OUTPUT_SIZE,
  NOTE_SUCCESSFUL_DECRYPTING_TIME,
  NOTE_TRIAL_DECRYPTING_TIME,
  L2_BLOCK_BUILD_TIME,
  L2_BLOCK_ROLLUP_SIMULATION_TIME,
  L2_BLOCK_PUBLIC_TX_PROCESS_TIME,
  NODE_HISTORY_SYNC_TIME,
  NOTE_HISTORY_SUCCESSFUL_DECRYPTING_TIME,
  NOTE_HISTORY_TRIAL_DECRYPTING_TIME,
  NODE_DB_SIZE,
  PXE_DB_SIZE,
} = require("./benchmark_shared.js");

const METRICS_GROUPED_BY_ROLLUP_SIZE = [
  L1_ROLLUP_CALLDATA_SIZE_IN_BYTES,
  L1_ROLLUP_CALLDATA_GAS,
  L1_ROLLUP_EXECUTION_GAS,
  L2_BLOCK_PROCESSING_TIME,
  NOTE_SUCCESSFUL_DECRYPTING_TIME,
  NOTE_TRIAL_DECRYPTING_TIME,
  L2_BLOCK_BUILD_TIME,
  L2_BLOCK_ROLLUP_SIMULATION_TIME,
  L2_BLOCK_PUBLIC_TX_PROCESS_TIME,
];

const METRICS_GROUPED_BY_CHAIN_LENGTH = [
  NODE_HISTORY_SYNC_TIME,
  NOTE_HISTORY_SUCCESSFUL_DECRYPTING_TIME,
  NOTE_HISTORY_TRIAL_DECRYPTING_TIME,
  NODE_DB_SIZE,
  PXE_DB_SIZE,
];

const METRICS_GROUPED_BY_CIRCUIT_NAME = [
  CIRCUIT_SIMULATION_TIME,
  CIRCUIT_INPUT_SIZE,
  CIRCUIT_OUTPUT_SIZE,
];

function formatValue(value) {
  return value;
}

function transpose(obj) {
  const transposed = {};
  for (const outerKey in obj) {
    const innerObj = obj[outerKey];
    for (const innerKey in innerObj) {
      if (!transposed[innerKey]) transposed[innerKey] = {};
      transposed[innerKey][outerKey] = innerObj[innerKey];
    }
  }
  return transposed;
}

function pick(benchmark, keys) {
  const result = {};
  for (const key of keys) {
    result[key] = benchmark[key];
  }
  return result;
}

function getTableContent(benchmark, groupUnit = "", col1Title = "Metric") {
  const rowKeys = Object.keys(benchmark);
  const groups = [
    ...new Set(rowKeys.flatMap((key) => Object.keys(benchmark[key]))),
  ];
  console.log(groups);
  const header = `| ${col1Title} | ${groups
    .map((i) => `${i} ${groupUnit}`)
    .join(" | ")} |`;
  const separator = `| - | ${groups.map(() => "-").join(" | ")} |`;
  const rows = rowKeys.map((key) => {
    const metric = benchmark[key];
    return `${key} | ${groups
      .map((i) => formatValue(metric[i]))
      .join(" | ")} |`;
  });

  return `
${header}
${separator}
${rows.join("\n")}
  `;
}

// Returns the md content to post
function getPostContent() {
  const benchmark = JSON.parse(fs.readFileSync(BENCHMARK_FILE_JSON, "utf-8"));
  delete benchmark.timestamp;

  return `
## Benchmark results

All benchmarks are run on txs on the \`Benchmarking\` contract on the repository. Each tx consists of a batch call to \`create_note\` and \`increment_balance\`, which guarantees that each tx has a private call, a nested private call, a public call, and a nested public call, as well as an emitted private note, an unencrypted log, and public storage read and write.

### L2 block published to L1

Each column represents the number of txs on an L2 block published to L1.
${getTableContent(pick(benchmark, METRICS_GROUPED_BY_ROLLUP_SIZE), "txs")}

### L2 chain processing

Each column represents the number of blocks on the L2 chain where each block has ${BLOCK_SIZE} txs.
${getTableContent(pick(benchmark, METRICS_GROUPED_BY_CHAIN_LENGTH), "blocks")}

### Circuits stats

Stats on running time and I/O sizes collected for every circuit run across all benchmarks.
${getTableContent(
  transpose(pick(benchmark, METRICS_GROUPED_BY_CIRCUIT_NAME)),
  "",
  "Circuit"
)}

${COMMENT_MARK}
`;
}

// Returns the number of the current PR
function getPrNumber() {
  if (!process.env.CIRCLE_PULL_REQUEST) throw new Error(`Not in Circle PR`);
  const fragments = process.env.CIRCLE_PULL_REQUEST.split("/");
  return fragments[fragments.length - 1];
}

// Function to check if a bench comment already exists
async function getExistingComment() {
  try {
    const response = await sendGitHubRequest(
      `/repos/${OWNER}/${REPO}/issues/${getPrNumber()}/comments`
    );
    const comments = JSON.parse(response);
    return comments.find((comment) => comment.body.includes(COMMENT_MARK));
  } catch (error) {
    throw new Error("Error checking for existing comments: " + error.message);
  }
}

// Function to create or update a comment
async function upsertComment(existingCommentId) {
  try {
    const commentContent = getPostContent();
    const commentData = { body: commentContent };

    const requestMethod = existingCommentId ? "PATCH" : "POST";
    const requestUrl = existingCommentId
      ? `/repos/${OWNER}/${REPO}/issues/comments/${existingCommentId}`
      : `/repos/${OWNER}/${REPO}/issues/${getPrNumber()}/comments`;

    await sendGitHubRequest(requestUrl, requestMethod, commentData);
    console.log("Comment added or updated successfully.");
  } catch (error) {
    throw new Error("Error adding or updating comment: " + error.message);
  }
}

// Function to send a request to the GitHub API
async function sendGitHubRequest(url, method = "GET", data = null) {
  const apiUrl = url.startsWith("http") ? url : `https://api.github.com${url}`;
  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": OWNER,
  };
  if (data) headers["Content-Type"] = "application/json";
  const requestOptions = { method, headers };

  return new Promise((resolve, reject) => {
    const req = https.request(apiUrl, requestOptions, (res) => {
      if (
        res.statusCode === 301 ||
        res.statusCode === 302 ||
        res.statusCode === 307
      ) {
        sendGitHubRequest(res.headers.location, method, data)
          .then(resolve)
          .catch(reject);
        return;
      } else {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(
              new Error(
                `GitHub API request failed with ${res.statusCode}: ${data}`
              )
            );
          }
        });
      }
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  try {
    const existingComment = await getExistingComment();
    await upsertComment(existingComment?.id);
  } catch (err) {
    console.error(`error while commenting on pull request:`, err);
    process.exit(1);
  }
}

main();
