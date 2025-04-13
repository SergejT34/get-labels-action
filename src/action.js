const github  = require("@actions/github");
const core = require("@actions/core");
const { Octokit } = require("@octokit/core");

export async function processTrigger() {
    let labels = await getPushEventLabels()
    if (labels.labels === 0) {
        return labels;
    }

    setOutputs(labels)
}

// new release example
async function getPushEventLabels() {
    const github_token = core.getInput('github_token');
    if (github_token === '') {
        core.error("github_token required for push events")
        return
    }
    // Octokit.js
    // https://github.com/octokit/core.js#readme
    const octokit = new Octokit({
        auth: github_token
    })

    try {
        const pulls = await octokit.request('GET /repos/{owner}/{repo}/commits/{commit_sha}/pulls', {
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            commit_sha: github.context.sha
        })
        core.info(pulls.data[0].labels)
        core.info(pulls.headers)
        return pulls.data[0].labels
    } catch (error) {
        core.error(error)
    }
    return [];
}

function setOutputs(labels) {
    const labelNames = labels.map(label => label.name )
    core.setOutput("labels", labelNames.join(','));

    const labelKey = core.getInput('label_key');
    const keyedValues = labelNames.filter(
        labelName => labelName.startsWith(labelKey+":")
    ).map(
        keyedLabel => keyedLabel.substring(labelKey.length+1, keyedLabel.length)
    )

    const valueOrder = core.getInput('label_value_order')
    const valueOrderArray = valueOrder.split(',')
    let outputValue = ''
    for (let value of valueOrderArray) {
        if (keyedValues.includes(value)) {
            outputValue = value
            break;
        }
    }

    if (outputValue === '') {
        if (keyedValues.length > 0) {
            outputValue = keyedValues.sort()[0]
        } else {
            outputValue = core.getInput('default_label_value')
        }
    }

    core.setOutput("label_value", outputValue);
    return outputValue
}
