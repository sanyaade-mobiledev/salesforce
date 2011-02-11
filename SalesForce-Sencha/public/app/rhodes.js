function getPage(url,execute)
{
	if (window.XMLHttpRequest)
	{
		xmlhttp=new XMLHttpRequest();

		xmlhttp.open("GET",url,false);
		xmlhttp.send(null);
		if (xmlhttp.responseText != null)
		{
			if(execute) { 
				return eval('(' + xmlhttp.responseText + ')'); 
			} else {
				return xmlhttp.responseText
			}
		} 
	}
	return -1;
}


function rho_logged_in() {
	return getPage('/app/Settings/logged_in',true);
}

function rho_sync() {
	return getPage('/app/Settings/do_sync',false);
}

function contact_sync_finished(){
	contactfields = getPage('/app/Scontact/model',true);
	Ext.regModel('SingleContact', {
		fields: contactfields
	});
	
	contact.SingleStore = new Ext.data.JsonStore({
		autoDestroy: true,
		storeId: 'singleContactStore',

		model: 'SingleContact',
		sorters: 'name',
		getGroupString : function(record) {
			return record.get('name')[0];
		},
		proxy: {
			type: 'ajax',
			url: '/app/Scontact/json',
			reader: {
				type: 'json',
				root: 'contacts',
				idProperty: 'id'
			}
		},
		idProperty: 'id',
		listeners: {
			load: {
				fn: function(store,array,success) {
					contact.DetailForm.user = store.data.items[0];
					contact.FormPanel.loadModel(contact.DetailForm.user);
					contact.Page.setActiveItem(1);
				}
			}
		}
	});	
	
	
	
	contact.DetailForm.items[0].items = getPage('/app/Scontact/metafields',true);
	contact.FormPanel = new Ext.form.FormPanel(contact.DetailForm);
	contact.FormPanel.doLayout();
	
	contact.DetailPanel.remove(contact.DetailPanel.items.items[0]);
	contact.DetailPanel.insert(0,contact.FormPanel);
	contact.DetailPanel.doLayout();
	
	contact.DataStore.load();
	contact.ContactList.refresh(); 
	contact.ContactList.setLoading(false,true);
	
}