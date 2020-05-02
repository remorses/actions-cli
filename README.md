# actions-cli

```
npm install -g actions-cli
```

## Usage

```
actions-cli login --token xxx
actions-cli ./
```

```
actions-cli

Fetch the current hash job status and logs

Commands:
  actions-cli login  Logins to cli
  actions-cli        Fetch the current hash job status and logs    [predefinito]

Positionals:
  path  The github repo path                         [stringa] [predefinito: ""]

Options:
  --version       Mostra il numero di versione                        [booleano]
  --verbose, -v                                  [booleano] [predefinito: false]
  -h              Mostra la schermata di aiuto                        [booleano]
  --sha           The sha to look for actions, at least 7 characters long
                                         [stringa] [richiesto] [predefinito: ""]
  --workflow, -w  The workflow file name             [stringa] [predefinito: ""]
  --job, -j       The job name, defaults to the first listed job
                                                     [stringa] [predefinito: ""]
```

### TODOS

-   multiple jobs per workflow
-   multiple workflows
-   ~~don't use the commit pushed from github actions~~
