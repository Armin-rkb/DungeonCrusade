using UnityEngine;
using System.Collections;

public class MatchEndButtons : MonoBehaviour {

    //GameObject
    [SerializeField]
    private GameObject[] _buttonObjects;
    //GameObject

    [SerializeField]
    private RoundManager _roundManager;


    void Awake()
    {
        _roundManager.OnGameEnd += ShowButtons;
    }

	void Start ()
    {
        foreach (GameObject button in _buttonObjects)
            button.SetActive(false);
	}

    void ShowButtons()
    {
        foreach (GameObject button in _buttonObjects)
            button.SetActive(true);
    }
	
}
