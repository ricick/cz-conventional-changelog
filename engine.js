"format cjs";

var wrap = require('word-wrap');
var map = require('lodash.map');
var longest = require('longest');
var rightPad = require('right-pad');

var filter = function(array) {
  return array.filter(function(x) {
    return x;
  });
};

// This can be any kind of SystemJS compatible module.
// We use Commonjs here, but ES6 or AMD would do just
// fine.
module.exports = function (options) {

  var types = options.types;

  var length = longest(Object.keys(types)).length + 1;
  var choices = map(types, function (type, key) {
    return {
      name: rightPad(key + ':', length) + ' ' + type.description,
      value: key
    };
  });
  var workflowChoices = [
    {name:'In progress', value: '#in-progress'},
    {name:'Ready for review', value: '#ready'},
  ]

  return {
    // When a user runs `git cz`, prompter will
    // be executed. We pass you cz, which currently
    // is just an instance of inquirer.js. Using
    // this you can ask questions and get answers.
    //
    // The commit callback should be executed when
    // you're ready to send back a commit template
    // to git.
    //
    // By default, we'll de-indent your commit
    // template and will keep empty lines.
    prompter: function(cz, commit) {
      console.log('\nLine 1 will be cropped at 100 characters. All other lines will be wrapped after 100 characters.\n');

      // Let's ask some questions of the user
      // so that we can populate our commit
      // template.
      //
      // See inquirer.js docs for specifics.
      // You can also opt to use another input
      // collection library if you prefer.
      cz.prompt([
        {
          type: 'list',
          name: 'type',
          message: 'Select the type of change that you\'re committing:',
          choices: choices,
          default: options.defaultType
        }, {
          type: 'input',
          name: 'issues',
          message: 'Add comma separated JIRA issue ID(s) (e.g. "AUTH-18", "CA-001, ABC-12") (required)\n',
          validate: function(input) {
            if (!input) {
              return 'Must specify issue IDs, otherwise, just use a normal commit message';
            } else {
              return true;
            }
          },
          default: options.defaultIssues
        }, {
          type: 'input',
          name: 'scope',
          message: 'What is the scope of this change (e.g. component or file name)? (press enter to skip)\n',
          default: options.defaultScope
        }, {
          type: 'input',
          name: 'subject',
          message: 'Write a short, imperative tense description of the change:\n',
          default: options.defaultSubject
        }, {
          type: 'list',
          name: 'workflow',
          message: 'Select the issue status this commit results in:\n',
          choices: workflowChoices,
          default: options.defaultWorkflow
        }, {
          type: 'input',
          name: 'time',
          message: 'Time spent (i.e. 3h 15m) (optional):\n',
        }, {
          type: 'input',
          name: 'body',
          message: 'Provide a longer description of the change: (press enter to skip)\n',
          default: options.defaultBody
        }, {
          type: 'confirm',
          name: 'isBreaking',
          message: 'Are there any breaking changes?',
          default: false
        }, {
          type: 'input',
          name: 'breaking',
          message: 'Describe the breaking changes:\n',
          when: function(answers) {
            return answers.isBreaking;
          }
        }
      ]).then(function(answers) {
        // console.log('answers', answers)

        var maxLineWidth = 100;

        var wrapOptions = {
          trim: true,
          newline: '\n',
          indent:'',
          width: maxLineWidth
        };

        // parentheses are only needed when a scope is present
        var scope = answers.scope.trim();
        scope = scope ? '(' + answers.scope.trim() + ')' : '';

        // Hard limit this line
        var head = (answers.type + scope + ': ' + answers.subject.trim())
        head += ' ' + answers.issues.trim().toUpperCase()
        head += ' ' + answers.workflow
        if(answers.time && answers.time.length){
          head += ' #time ' + answers.time
        }
        head = head.slice(0, maxLineWidth);
        // Wrap these lines at 100 characters
        var body = wrap(answers.body, wrapOptions);

        // Apply breaking change prefix, removing it if already present
        var breaking = answers.breaking ? answers.breaking.trim() : '';
        breaking = breaking ? 'BREAKING CHANGE: ' + breaking.replace(/^BREAKING CHANGE: /, '') : '';
        breaking = wrap(breaking, wrapOptions);


        var footer = filter([ breaking ]).join('\n\n');

        commit(head + '\n\n' + body + '\n\n' + footer);
      });
    }
  };
};
