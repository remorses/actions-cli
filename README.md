<div align='center'>
    <br/>
    <br/>
    <h1>actions-cli</h1>
    <h3>Monitor your GitHub Actions from the command line</h3>
    <br/>
    <img width='500px' src='https://media.giphy.com/media/JUYF1dCf2qQ1T63VFU/giphy.gif'>
    <br/>
    <br/>
</div>

```
npm install -g actions-cli
```

## Usage

```
$ actions-cli login
$ actions-cli ./
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
-   ~~use latest commit pushed instead of latest commit~~ use -p
-   ~~don't use the commit pushed from github actions~~ use -n
