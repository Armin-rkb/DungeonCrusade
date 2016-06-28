using UnityEngine;
using UnityEngine.UI;
using System.Collections;

public class SelectedPanels : MonoBehaviour {

    [SerializeField]
    private Text _selectedText;

    [SerializeField]
    private Color[] _color;

	void Start () 
    {
        InvokeRepeating("StartRunning", 0.5F, 0.5f);
	}
	
    void StartRunning()
    {
        if (this.gameObject.activeSelf)
        StartCoroutine("Blinking");
    }

      IEnumerator Blinking()
    {
        _selectedText.color = _color[0];
        yield return new WaitForSeconds(0.25f);
        _selectedText.color = _color[1];
    }
}
