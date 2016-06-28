using UnityEngine;
using System.Collections;

public class ShowPanels : MonoBehaviour {

    [SerializeField]
    private GameObject[] _bestOfSelection;

    [SerializeField]
    private GameObject[] _stageSelection;

    [SerializeField]
    private BestOfManager _bestOfManager;
	
	void Update()
    {
        if (_bestOfManager.GetDoneSelection)
        {
            foreach (GameObject bestofselection in _bestOfSelection)
                bestofselection.SetActive(false);

            foreach (GameObject stageSelection in _stageSelection)
                stageSelection.SetActive(true);
        }
        else
        {
            foreach (GameObject bestofselection in _bestOfSelection)
                bestofselection.SetActive(true);

            foreach (GameObject stageSelection in _stageSelection)
                stageSelection.SetActive(false);
        }
    }
}
