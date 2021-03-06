import * as ko from "knockout";
import * as Survey from "survey-knockout";
import { SurveyPropertyTextEditor } from "./propertyModalEditor";
import { SurveyPropertyEditorBase } from "./propertyEditorBase";
import { SurveyPropertyEditorFactory } from "./propertyEditorFactory";
import * as editorLocalization from "../editorLocalization";

export class SurveyPropertyConditionEditor extends SurveyPropertyTextEditor {
  public availableOperators = [];
  koIsValid: any;
  koCanAddCondition: any;
  koAddConditionQuestion: any;
  koAddConditionOperator: any;
  koAddConditionValue: any;
  koAddConditionType: any;
  koShowAddConditionType: any;
  koAddConditionButtonText: any;
  koAddContionValueEnabled: any;
  onConditionAddClick: any;
  constructor(
    property: Survey.JsonObjectProperty,
    private _type: string = "condition",
    public syntaxCheckMethodName: string = "createCondition"
  ) {
    super(property);
    this.availableOperators = SurveyPropertyEditorFactory.getOperators();
    this.koIsValid = ko.observable(true);
    this.koAddConditionQuestion = ko.observable("");
    this.koAddConditionOperator = ko.observable("");
    this.koAddConditionValue = ko.observable("");
    this.koAddConditionType = ko.observable("and");
    var self = this;
    this.koCanAddCondition = ko.computed(function() {
      return (
        this.koAddConditionQuestion() != "" &&
        this.koAddConditionQuestion() != undefined &&
        this.koAddConditionOperator() != "" &&
        (!this.koAddContionValueEnabled() || this.koAddConditionValue() != "")
      );
    }, this);
    this.koShowAddConditionType = ko.computed(function() {
      if (!this.koIsValid()) return false;
      var text = this.koTextValue();
      if (text) text = text.trim();
      return text;
    }, this);
    this.koAddConditionButtonText = ko.computed(function() {
      var name = this.koIsValid()
        ? "conditionButtonAdd"
        : "conditionButtonReplace";
      return editorLocalization.editorLocalization.getString("pe." + name);
    }, this);
    this.koAddContionValueEnabled = ko.computed(function() {
      var op = this.koAddConditionOperator();
      return op != "empty" && op != "notempty";
    }, this);
    this.onConditionAddClick = function() {
      self.addCondition();
    };
    this.resetAddConditionValues();
  }
  public get editorType(): string {
    return this._type;
  }
  public get availableQuestions(): any[] {
    if (this.object instanceof Survey.MatrixDropdownColumn) {
      return this.object.colOwner["survey"].getAllQuestions();
    }
    return (this.object && this.object.survey.getAllQuestions()) || [];
  }
  public get allCondtionQuestions(): any[] {
    if (!this.object) return [];
    var names = [];
    var questions = this.availableQuestions;
    for (var i = 0; i < questions.length; i++) {
      this.addConditionQuestionNames(questions[i], names);
    }
    this.addMatrixColumnsToCondtion(names);
    this.addPanelDynamicQuestionsToCondtion(names);
    names.sort();
    return names;
  }
  private addConditionQuestionNames(
    question: Survey.QuestionBase,
    names: Array<string>
  ) {
    if (question == this.object) return;
    if (question["addConditionNames"]) {
      question["addConditionNames"](names);
    } else {
      names.push(question.name);
    }
  }
  private addMatrixColumnsToCondtion(names: Array<string>) {
    if (
      !(this.object instanceof Survey.MatrixDropdownColumn) ||
      !this.object ||
      !this.object.colOwner ||
      !this.object.colOwner["columns"]
    )
      return;
    var columns = this.object.colOwner["columns"];
    for (var i = 0; i < columns.length; i++) {
      if (columns[i] == this.object) continue;
      names.push("row." + columns[i].name);
    }
  }
  private addPanelDynamicQuestionsToCondtion(names: Array<string>) {
    if (!(this.object.data instanceof Survey.QuestionPanelDynamicItem)) return;
    var panel: Survey.PanelModel = this.object.data.panel;
    var questionNames = [];
    for (var i = 0; i < panel.questions.length; i++) {
      var q = panel.questions[i];
      if (q.name == this.object.name) continue;
      this.addConditionQuestionNames(q, questionNames);
    }
    for (var i = 0; i < questionNames.length; i++) {
      names.push("panel." + questionNames[i]);
    }
  }
  public get hasAceEditor(): boolean {
    return (
      typeof ace !== "undefined" &&
      typeof ace.require("ace/ext/language_tools") !== "undefined"
    );
  }
  public setup() {
    super.setup();
  }
  public get addConditionQuestionOptions(): string {
    return editorLocalization.editorLocalization.getString(
      "pe.conditionSelectQuestion"
    );
  }
  public addCondition() {
    if (!this.koCanAddCondition()) return;
    var text = "";
    if (this.koShowAddConditionType()) {
      text = this.koTextValue() + " " + this.koAddConditionType() + " ";
    }
    text +=
      "{" +
      this.koAddConditionQuestion() +
      "} " +
      this.getAddConditionOperator();
    if (this.koAddContionValueEnabled()) {
      text += " " + this.getAddConditionValue();
    }
    this.koTextValue(text);
    this.resetAddConditionValues();
  }
  private getAddConditionOperator(): string {
    var op = this.koAddConditionOperator();
    if (op == "equal") return "=";
    if (op == "notequal") return "<>";
    if (op == "greater") return ">";
    if (op == "less") return "<";
    if (op == "greaterorequal") return ">=";
    if (op == "lessorequal") return "<=";
    return op;
  }
  private getAddConditionValue(): string {
    var val = this.koAddConditionValue();
    if (!val) return val;
    if (val == "true" || val == "false") return val;
    if (!isNaN(val)) return val;
    if (!this.isQuote(val[0])) val = "'" + val;
    if (!this.isQuote(val[val.length - 1])) val = val + "'";
    return val;
  }
  private isQuote(ch: string): boolean {
    return ch == "'" || ch == '"';
  }
  protected onkoTextValueChanged(newValue) {
    if (!newValue) {
      this.koIsValid(true);
    } else {
      var conditionParser: any = new Survey.ConditionsParser();
      conditionParser[this.syntaxCheckMethodName](newValue);
      this.koIsValid(!conditionParser.error);
    }
  }
  private resetAddConditionValues() {
    this.koAddConditionQuestion("");
    this.koAddConditionOperator("equal");
    this.koAddConditionValue("");
  }
}

SurveyPropertyEditorFactory.registerEditor("condition", function(
  property: Survey.JsonObjectProperty
): SurveyPropertyEditorBase {
  return new SurveyPropertyConditionEditor(
    property,
    "condition",
    "createCondition"
  );
});
SurveyPropertyEditorFactory.registerEditor("expression", function(
  property: Survey.JsonObjectProperty
): SurveyPropertyEditorBase {
  return new SurveyPropertyConditionEditor(
    property,
    "expression",
    "parseExpression"
  );
});

var operations = [
  {
    value: "and",
    title: "logical 'and' operator"
  },
  {
    value: "&&",
    title: "logical 'and' operator"
  },
  {
    value: "or",
    title: "logical 'or' operator"
  },
  {
    value: "||",
    title: "logical 'or' operator"
  },
  {
    value: "empty",
    title: "returns true if the left operand is empty	{questionName} empty"
  },
  {
    value: "notempty",
    title:
      "returns true if the left operand is not empty	{questionName} notempty"
  },
  {
    value: "=",
    title:
      "returns true if two values are equal	{questionName} = 5, {questionName} == 'abc', {questionName} equal 124"
  },
  {
    value: "==",
    title:
      "returns true if two values are equal	{questionName} = 5, {questionName} == 'abc', {questionName} equal 124"
  },
  {
    value: "equal",
    title:
      "returns true if two values are equal	{questionName} = 5, {questionName} == 'abc', {questionName} equal 124"
  },
  {
    value: "<>",
    title:
      "returns true if two values are not equal	{questionName} <> 5, {questionName} != 'abc', {questionName} notequal 124"
  },
  {
    value: "!=",
    title:
      "returns true if two values are not equal	{questionName} <> 5, {questionName} != 'abc', {questionName} notequal 124"
  },
  {
    value: "notequal",
    title:
      "returns true if two values are not equal	{questionName} <> 5, {questionName} != 'abc', {questionName} notequal 124"
  },
  {
    value: ">",
    title:
      "returns true if the left operand greater then the second operand	{questionName} > 2, {questionName} greater 'a'"
  },
  {
    value: "greater",
    title:
      "returns true if the left operand greater then the second operand	{questionName} > 2, {questionName} greater 'a'"
  },
  {
    value: "<",
    title:
      "returns true if the left operand less then the second operand	{questionName} < 2, {questionName} less 'a'"
  },
  {
    value: "less",
    title:
      "returns true if the left operand less then the second operand	{questionName} < 2, {questionName} less 'a'"
  },
  {
    value: ">=",
    title:
      "returns true if the left operand equal or greater then the second operand	{questionName} >= 2, {questionName} greaterorequal 'a'"
  },
  {
    value: "greaterorequal",
    title:
      "returns true if the left operand equal or greater then the second operand	{questionName} >= 2, {questionName} greaterorequal 'a'"
  },
  {
    value: "<=",
    title:
      "returns true if the left operand equal or less then the second operand	{questionName} <= 2, {questionName} lessorequal 'a'"
  },
  {
    value: "lessorequal",
    title:
      "returns true if the left operand equal or less then the second operand	{questionName} <= 2, {questionName} lessorequal 'a'"
  },
  {
    value: "contains",
    title:
      "return true if the left operand is an array and it contains a value of the second operand	{questionName} contains 'a'"
  },
  {
    value: "notcontains",
    title:
      "return true if the left operand is an array and it does not contain a value of the second operand"
  }
];

const createAnnotations = (
  condition: string,
  syntaxCheckMethodName: string
): AceAjax.Annotation[] => {
  condition = condition || "";
  var annotations = new Array<AceAjax.Annotation>();
  var conditionParser: any = new Survey.ConditionsParser();
  conditionParser[syntaxCheckMethodName](condition);
  if (!!condition && conditionParser.error) {
    var toErrorSubstring = condition.substring(0, conditionParser.error.at);
    var column = toErrorSubstring.length - toErrorSubstring.lastIndexOf("\n");
    var annotation: AceAjax.Annotation = {
      row: condition.match(/\n/g) ? condition.match(/\n/g).length : 0,
      column: column,
      text: conditionParser.error.code + " (" + column + ")",
      type: "error"
    };
    annotations.push(annotation);
  }
  return annotations;
};

var ID_REGEXP = /[a-zA-Z_0-9{\*\/\<\>\=\!\$\.\-\u00A2-\uFFFF]/;

export function doGetCompletions(
  prevIdentifier: string,
  prefix: string,
  config: { question: Survey.QuestionBase; questions: Survey.Question[] },
  completer = null
) {
  var completions = [];
  var currentQuestion: Survey.QuestionBase = config.question;
  var usableQuestions = (config.questions || []).filter(
    q => q !== currentQuestion
  );
  if (
    !!usableQuestions ||
    currentQuestion instanceof Survey.MatrixDropdownColumn ||
    currentQuestion.data instanceof Survey.QuestionPanelDynamicItem
  ) {
    if (
      prevIdentifier === "row" &&
      currentQuestion instanceof Survey.MatrixDropdownColumn
    ) {
      completions = currentQuestion.colOwner["columns"]
        .filter(e => e.name !== currentQuestion.name)
        .map(column => {
          return {
            name: "",
            value: "{row." + column.name + "}",
            some: "",
            meta: column.title,
            identifierRegex: ID_REGEXP
          };
        });
    } else if (
      prevIdentifier === "panel" &&
      currentQuestion.data instanceof Survey.QuestionPanelDynamicItem
    ) {
      var panel: Survey.PanelModel = currentQuestion.data.panel;
      completions = panel.elements
        .filter(e => e.name !== currentQuestion.name)
        .map(element => {
          return {
            name: "",
            value: "{panel." + element.name + "}",
            some: "",
            meta: element.name,
            identifierRegex: ID_REGEXP
          };
        });
    } else {
      var operationsFiltered = operations.filter(
        op => !prefix || op.value.indexOf(prefix) !== -1
      );
      var questionsFiltered = usableQuestions.filter(
        op => !prefix || op.name.indexOf(prefix) !== -1
      );
      if (currentQuestion instanceof Survey.MatrixDropdownColumn) {
        completions.push({
          name: "",
          value: "{row.",
          some: "",
          meta: editorLocalization.editorLocalization.getString(
            editorLocalization.defaultStrings.pe.aceEditorRowTitle
          ),
          identifierRegex: ID_REGEXP
        });
      } else if (
        currentQuestion.data instanceof Survey.QuestionPanelDynamicItem
      ) {
        completions.push({
          name: "",
          value: "{panel.",
          some: "",
          meta: editorLocalization.editorLocalization.getString(
            editorLocalization.defaultStrings.pe.aceEditorPanelTitle
          ),
          identifierRegex: ID_REGEXP
        });
      }
      completions = completions
        .concat(
          questionsFiltered.map(q => {
            return {
              completer: completer,
              name: "",
              value: "{" + q.name + "}",
              some: "",
              meta: q.title,
              identifierRegex: ID_REGEXP
            };
          })
        )
        .concat(
          operationsFiltered.map(op => {
            return {
              name: "",
              value: op.value,
              some: "",
              meta: op.title,
              identifierRegex: ID_REGEXP
            };
          })
        );
    }
  }
  return completions;
}

export function insertMatch(editor, data) {
  if (editor.completer.completions.filterText) {
    var allRanges = editor.selection.getAllRanges();
    for (
      var rangeIndex = 0, range;
      (range = allRanges[rangeIndex]);
      rangeIndex++
    ) {
      range.start.column -= editor.completer.completions.filterText.length;
      var rangeText = editor.session.getTextRange(range);
      if (rangeText.indexOf("{") !== 0) {
        var extRange = range.clone();
        extRange.start.column--;
        if (editor.session.getTextRange(extRange).indexOf("{") === 0) {
          range = extRange;
        }
      }
      editor.session.remove(range);
    }
  }
  editor.execCommand("insertstring", data.value || data);
}

ko.bindingHandlers.aceEditor = {
  init: function(element, options) {
    var configs = options();
    var langTools = ace.require("ace/ext/language_tools");
    var langUtils = ace.require("ace/autocomplete/util");
    var editor = ace.edit(element);
    var objectEditor: SurveyPropertyConditionEditor = configs.editor;
    var isUpdating = false;

    editor.setOption("useWorker", false);

    editor.getSession().on("change", function() {
      var errors = createAnnotations(
        editor.getValue(),
        objectEditor.syntaxCheckMethodName
      );
      isUpdating = true;
      objectEditor.koTextValue(editor.getValue());
      isUpdating = false;
      //   objectEditor.koHasError(errors.length > 0);
      //   if (errors.length > 0) {
      //     objectEditor.koErrorText(errors[0].text);
      //   }
      editor.getSession().setAnnotations(errors);
    });

    var updateCallback = () => {
      if (!isUpdating) {
        editor.setValue(objectEditor.koTextValue() || "");
      }
    };
    var valueSubscription = objectEditor.koTextValue.subscribe(updateCallback);
    updateCallback();

    var completer = {
      identifierRegexps: [ID_REGEXP],
      insertMatch: insertMatch,
      getCompletions: (editor, session, pos, prefix, callback) => {
        var prevIdentifier = langUtils.retrievePrecedingIdentifier(
          session.getLine(pos.row),
          pos.column - 1
        );
        var completions = doGetCompletions(
          prevIdentifier,
          prefix,
          configs,
          completer
        );
        callback(null, completions);
      },
      getDocTooltip: function(item) {
        item.docHTML =
          "<div style='max-width: 300px; white-space: normal;'>" +
          item.meta +
          "</div>";
      }
    };
    langTools.setCompleters([completer]);
    editor.setOptions({
      enableBasicAutocompletion: true,
      enableLiveAutocompletion: true
    });

    ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
      editor.destroy();
      valueSubscription.dispose();
    });

    editor.focus();
  }
};
