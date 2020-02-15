/*
Program: Grocery List
Author: Brian Chaves
Last Updated: October 21,2013
*/


// A. Validation functions
var errors = {};

function displayErrors() {
    // initialise variables
    var haveErrors = false;

    // remove the invalid class for all inputs
    $(":input.invalid").removeClass("invalid");

    // iterate through the fields specified in the errors array
    for (var fieldName in errors) {
        haveErrors = true;
        $("input[item_name='" + fieldName + "']").addClass("invalid");
    } // for

    // if we have errors, then add a message to the errors div
    $("#errors")
        .html(haveErrors ? "Errors were found." : "")
        .css("display", haveErrors ? "block" : "none");
} // displayErrors

function displayFieldErrors(field) {
    var messages = errors[field.item_name];
    if (messages && (messages.length > 0)) {
        // find an existing error detail section for the field
        var errorDetail = $("#errordetail_" + field.id).get(0);

        // if it doesn't exist, then create it
        if (!errorDetail) {
            $(field).before("<ul class='errors-inline' id='errordetail_" + field.id + "'></ul>");
            errorDetail = $("#errordetail_" + field.id).get(0);
        } // if

        // add the various error messages to the div
        for (var ii = 0; ii < messages.length; ii++) {
            $(errorDetail).html('').append("<li>" + messages[ii] + "</li>");
        } // for
    } // if
} // displayFieldErrors


// B. DB functions

function errorHandler(transaction, error) {
    alert("SQL error: " + error.message);
}

// open the database
var grocListDB = openDatabase('grocListDB', '1.0', 'grocList DB', 100 * 1024);

function createTables() {
    // create the grocery list table if it doesn't exist
    grocListDB.transaction(function (transaction) {
        var sqlString =
        "CREATE TABLE IF NOT EXISTS grocery_list ("
	        + " id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,"
	        + " item_name VARCHAR NOT NULL," 
	        + " quanity INTEGER,"
	        + " price DECIMAL,"            
	        + " priority INTEGER NOT NULL"
        + ");";
        transaction.executeSql(sqlString, [], null, errorHandler);
    }, errorHandler);
}


// drop table called only when clear all is clicked
function dropTables() {
    var query = 'DROP TABLE IF EXISTS grocery_list;';
    try {
        grocListDB.transaction(function (transaction) {
            transaction.executeSql(query, [], null, errorHandler);
        });
    }
    catch (e) {
        alert("Error: Unable to drop table " + e + ".");
        return;
    }
}

// C. Utility functions

// OO style methods

String.prototype.capitalize = function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

// traditional functions
function formatNumber(num, decimals) {
    if (decimals == undefined) {
        decimals = 0;
    }
    return num.toFixed(decimals).toString().split('').reverse().join('').replace(/(?=\d*\.?)(\d{3})/g, '$1,').split('').reverse().join('').replace(/^[\,]/, '');
}

// D. form specific functions

// getAll function must precede update and delete
function onGetAllSuccess(results) {  // no need to pass transaction...
    // alert("rows: " + results.rows.length);
    
    // initialise a string to hold the html line items
    var listHTML = '';
    var viewString = '';
    var deleteString = '';
    var aRow = null;

    listHTML = '<div data-role="content">';

    if (results.rows.length == 0) {
        listHTML += '<h4>No records found.</h4>';
    }

    // read each of the rows from the results
    for (var i = 0; i < results.rows.length; i++) {
        aRow = results.rows.item(i);
        var price= aRow['price'];
        if (price=="NULL")
        {
        	price=0;
        }

        viewString = "populateViewForm(" + aRow['id'] + ",'" + aRow['item_name']
            + "','" + aRow['quanity'] + "',"+aRow['price']+"," + aRow['priority']
            + ");";

        deleteString = "deleteItem(" + aRow['id'] + ", '"
            + aRow['item_name'] + "');";
        
        listHTML +='<div class="ui-grid-d" style="height: 40px">'
            + '<div class="ui-block-a">'
            + '<div class="ui-bar ui-bar-c" style="border: 1; height: 40px">'
            + '<h3>'
            + aRow['item_name']
            + '</h3></div></div>'
            + '<div class="ui-block-b">'
            + '<div class="ui-bar ui-bar-c" style="border: 1; height: 40px">'
            + '<h3>'
            + aRow['quanity']
            + '</h3></div></div>'
            + '<div class="ui-block-c">'
            + '<div class="ui-bar ui-bar-d" style="border: 1; height: 40px">'
            + '<h3>'
            + toCurrency( aRow['price'])
            + '</h3></div></div>'
            + '<div class="ui-block-d">'
            + '<div class="ui-bar ui-bar-d" style="border: 1; height: 40px">'
            + '<h6>'
            + priorityID_ToString(aRow['priority'])
            + '</h6></div></div>'
            + '<div class="ui-block-e">'
            + '<div class="ui-bar ui-bar-d" style="border: 1; height: 40px">'
            + '<img id="linkViewRow" src="images/view.bmp" style="height: 30px; width: 30px;" class="ui-btn-right" onclick="'
            + viewString
            + '"/><h1>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</h1><img src="images/delete-icon.png" style="align=right; height: 20px; width: 20px;" class="ui-btn-right" onclick="'
            + deleteString
            + '"/> </div></div></div>'; 
    } // for

    listHTML += '</div>';

    $("#listView").empty();
    $("#listView").append(listHTML);
    $("#listView").listview('refresh'); 
}


function getFullList() {

    grocListDB.transaction(function (transaction) {
        transaction.executeSql("SELECT rowid as id, * FROM grocery_list ORDER BY priority DESC",
				[],
                function (transaction, results) { onGetAllSuccess(results) },
                errorHandler);
    });
}

function onUpdateSuccess() {
    alert("Row updated");

    // refresh an element on any page to refresh the new values
    $("#view-list").listview('refresh');

    // refresh display and move to all page
    getFullList(function () { onGetFullListComplete() });
    $.mobile.changePage('#fullList', { transition: 'slide' });

}

function onDeleteSuccess() {
    getFullList(function () { onGetFullListComplete() });
}

function deleteItem(id, itemName) {
    var sqlString = "DELETE FROM grocery_list WHERE id = " + id + ";";
    // confirm delete
    var confirmStr = "This will delete '" + itemName + "'. Continue delete?";
    var result = confirm(confirmStr);

    if (result === true) {
        grocListDB.transaction(function (transaction) {
            transaction.executeSql(
                    sqlString,
                    [],
                    function () {
                        onDeleteSuccess();
                    },
                    errorHandler
                );
        });
    }
} // deleteItem

function setFormDefaultValues() {
    addToListForm.itemName.value = '';
    addToListForm.itemQuanity.value = '';
    addToListForm.itemPrice.value='';
    addToListForm.itemPriority.value='2';
}

function populateViewForm(id, item_name, quanity, price , priority) {
    // hidden
    viewForm.rowid.value = id;
    // read-only
    viewForm.itemNameView.value = item_name;
    viewForm.itemQuanityView.value = quanity;
    //try
    //{
    viewForm.itemPriceView.value= toCurrency(price);
    //}
    //catch(exception)
    //{
    //	viewForm.itemPriceView.value= price;
    //}
    //viewForm.itemPriceView.value= price;
    viewForm.itemPriorityView.value = priorityID_ToString(priority);
    viewForm.itemTotalPrice.value=toCurrency(price*quanity);

    
    var html="<a href=''> <img id='linkViewRow' src='images/edit-icon.png' "+
    	"style='height: 30px; width: 30px;' class='ui-btn-right' "+
    	"onClick='populateEditForm("+id+",\""+item_name+"\","+quanity+","+
    	price+","+priority+");' /></a>";
    	
	try
    {
	    $("#editButton").empty();
	    $("#editButton").append(html);
   	}
   	catch(exception)
   	{
   		alert(html);
   	}
   	// */
  	//alert(html);
    $.mobile.changePage('#viewPage', { transition: 'slide' });
    
}

function populateEditForm(id, item_name, quanity, price , priority) {

	//*
    // hidden
    editForm.itemIdEdit.value = id;
    // read-only
    editForm.itemNameEdit.value = item_name;

    // update fields
    editForm.itemQuanityEdit.value = quanity;
    editForm.itemPriceEdit.value = price;
    editForm.itemPriorityEdit.value = priority;
    editForm.itemTotalPriceEdit.value="null";
   
    // refresh an element on any page to refresh the new values
    $("#lsttasks").listview('refresh');
    updateTotalCostEdit();
    $.mobile.changePage('#editPage', { transition: 'slide' });
    // */
}

// on first load, create table (if not exist) and get rows 
// Note: does not guarantee completion when page is displayed
createTables();
getFullList();

// start of main function
$(document).ready(function () {

    // set the defaults
    //setFormDefaultValues();

    // error handling
    $(":input").focus(function (evt) {
        displayFieldErrors(this);
    }).blur(function (evt) {
        $("#errordetail_" + this.id).remove();
    });
    function displayInsertCompleted() {
        alert("New item added.");
        // stay on same page to add more rows
        setFormDefaultValues();
    }
    
    function displayUpdateCompleted() {
        alert("item updated successfuly.");
        // stay on same page to add more rows
        setFormDefaultValues();
    }

    function addItem(item_name, quanity,price , priority, callback) {
        var sqlString = "INSERT INTO grocery_list (item_name, quanity,price , priority)"
            + " VALUES (?, ? , ? , ?);";
        grocListDB.transaction(function (transaction) {
            transaction.executeSql(
                sqlString,
                [item_name, quanity,price, priority],
                callback,
                errorHandler
            );

        });
    } // addItem
    
    function updateItem(itemID, quanity,price , priority, callback,itemName) {
        var sqlString =
        	"UPDATE grocery_list SET "+
	        	"quanity = "+quanity + ", "+
	        	"price = "+price+" , "+
	        	"priority = "+priority+" "+
        	"WHERE id = "+ itemID +";";
        alert(sqlString);
        grocListDB.transaction(function (transaction) {
            transaction.executeSql(
                sqlString,
                [],
                callback,
                errorHandler
            );
		populateViewForm(itemID, itemName, quanity, price , priority);

        });
    } // addItem

    $("#addToList").click(function () {
        updateTotalCost();
        
    });
    

    $("#fullList").click(function () {
        try {
            getFullList();
        }
        catch (e) {
            alert(e);
        }
    });

    function clearList(callback) {
        try {
            grocListDB.transaction(function (transaction) {
                transaction.executeSql("DELETE FROM grocery_list",
				[], callback, errorHandler);
            });
        }
        catch (e) {
            alert(e);
        }
    }

    function displayClearCompleted() {
        $("#fullList").empty();
        $("#fullList").listview('refresh');
    }

    $("#btnClear").click(function () {
        // confirm clear
        var result = confirm("This will permanently remove ALL records. Continue delete?");

        try {
            if (result === true) {
                // drop table and recreate table
                dropTables();
                createTables();
                displayClearCompleted();
            }
        }
        catch (e) {
            alert(e);
        }
    });


    $("#btnSubmit").click(function () {
        // validate only when Submit click
         
        $("#addToListForm").validate
        ({
            rules:
            {
            	itemName:
            	{
            		required:true,
            		rangelength:[2,24]
            	},
            	itemQuanity:
            	{
            		digits:true
            	},
            	itemPrice:
            	{
            		number:true
            	}
            	
            },//end of rules
            messages:
            {
            	itemName:
            	{
            		required:	"Item Name must be between 2 to 24 charaters long.",
            		rangelength:"Item Name must be between 2 to 24 charaters long."
            	},
            	itemQuanity:
            	{
            		digits:"quantity has to be a whole number"
            	},
            	itemPrice:
            	{
            		number:"price has to be a number"
            	}
            	
            }
        }); // validate
        
        
        if ($('#addToListForm').valid())
        {
			try
			{
                var item_name = addToListForm.itemName.value;
                item_name = item_name.capitalize();
                //quanity is set to one if left blank
                var quanity;if (addToListForm.itemQuanity.value=="")
                {
                	quanity=1;
                }
                else
                {
                	quanity=addToListForm.itemQuanity.value;
                }
                var price;
                if(addToListForm.itemPrice.value=="")
                {
                	price="NULL";
                }
                else
                {
                	price=addToListForm.itemPrice.value;
                }
                var priority = addToListForm.itemPriority.value;

                // TO DO: call validate()
                addItem(item_name, quanity,price , priority, function () {
                    displayInsertCompleted();
                    }
                );
                
            }
            catch (e)
            {
                alert(e);
            }
							
		} // end if
		

    }); // btnSubmit
    
    $("#btnUpdate").click(function () {
        
        $("#editForm").validate
        ({
            rules:
            {
            	itemQuanityEdit:
            	{
            		digits:true
            	},
            	itemPriceEdit:
            	{
            		number:true
            	}
            	
            },//end of rules
            messages:
            {
            	itemQuanityEdit:
            	{
            		digits:"quantity has to be a whole number"
            	},
            	itemPriceEdit:
            	{
            		number:"price has to be a number"
            	}
            	
            }
        }); // validate
        
        
        if ($('#editForm').valid())
        {
			try
			{
				/*
				// validate only when Submit click
		        // alert("Update pressed");
		        try {
		            // alert("Entry Form: No errors found");
		            var rowid = editForm.rowid.value;
		            var desc = editForm.taskdesc.value;
		            var due = editForm.taskdue.value;
		            updatetask(rowid, desc, due);
		        }
		        catch (e) {
		            alert(e);
		        }
		        */
				
                //quanity is set to one if left blank
                var itemID=editForm.itemIdEdit.value;
                var itemName = editForm.itemNameEdit.value;
                var quanity;if (editForm.itemQuanityEdit.value=="")
                {
                	quanity=1;
                }
                else
                {
                	quanity=editForm.itemQuanityEdit.value;
                }
                var price;
                if(editForm.itemPriceEdit.value=="")
                {
                	price="NULL";
                }
                else
                {
                	price=editForm.itemPriceEdit.value;
                }
                var priority = editForm.itemPriorityEdit.value;

                // TO DO: call validate()
                /*
                addItem(item_name, quanity,price , priority, function () {
                    displayInsertCompleted();
                    }
                );
                */
                updateItem(itemID, quanity,price , priority,
                	function(){displayUpdateCompleted();},itemName);
                
            }
            catch (e)
            {
                alert(e);
            }
							
		} // end if
    }); // btnUpdate
    
    
	$("#itemQuanity").change(function () {
		updateTotalCost();
		
	});
	
	$("#itemPrice").change(function () {
		updateTotalCost();
	});
	
	$("#itemQuanityEdit").change(function () {
		updateTotalCostEdit();
		
	});
	
	$("#itemPriceEdit").change(function () {
		updateTotalCostEdit();
	});
	
});

function updateTotalCost()
{
	var quanity = addToListForm.itemQuanity.value;
	var price = addToListForm.itemPrice.value;
	
	try
	{
		if(isNaN(quanity) || isNaN(price))
		{
			addToList.itemCost.value="";
		}
		else
		{
			addToListForm.itemCost.value=toCurrency(quanity*price);
		}
		
	}
	catch(exception)
	{
		addToListForm.itemCost.value="";
	}
	
}

function updateTotalCostEdit()
{
	var quanity = editForm.itemQuanityEdit.value;
	var price = editForm.itemPriceEdit.value;
	
	try
	{
		if(isNaN(quanity) || isNaN(price))
		{
			editForm.itemTotalPriceEdit.value="";
		}
		else
		{
			editForm.itemTotalPriceEdit.value=toCurrency(quanity*price);
		}
		
	}
	catch(exception)
	{
		editForm.itemTotalPriceEdit.value="";
	}
	
}

function priorityID_ToString(priorityID)
{
	if(priorityID==1)
	{
		return "Nice To Have";
	}
	else if(priorityID==2)
	{
		return "Normal";
	}
	else if(priorityID==3)
	{
		return "Important";
	}
	else if(priorityID==4)
	{
		return "Very Important";
	}
	else
	{
		return "ERROR!";
	}
	
}

function calculateTotalPrice(quanity,price)
{
	try
	{
		if(quanity == null || price==null)
		{
			return "null";
		}
		else
		{
			return toCurrency(quanity * price);
		}
	}
	catch(exception)
	{
		return "null";
	}

}

function toCurrency(money)
{
	try
	{
		money
		var DECIMAL_PLACES=2; 
		if(isNaN(money))
		{
			return "";
		}
		else if(money==0)
		{
			return "";
		}
		{
			return "$"+money.toFixed(DECIMAL_PLACES);
		}
	}
	catch(exception)
	{
		return money;
	}
}
