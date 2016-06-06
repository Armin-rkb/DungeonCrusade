using UnityEngine;
using UnityEngine.UI;
using System.Collections;
using System.Collections.Generic;

public class RoundText : MonoBehaviour {


    [SerializeField]
    private RoundManager _roundManager;

    //List
    [SerializeField]
    private List<GameObject> _roundObjects;
    //List

    //Text
    private Text _roundText;
    //Text


    void Awake()
    {

        _roundManager.OnRoundStart += ShowRound;
        _roundManager.OnRoundEnd += DisableRound;
    }

    void Start()
    {

        foreach (GameObject roundobj in _roundObjects)
            _roundText = roundobj.GetComponent<Text>();

        _roundText.text = "Round " + _roundManager.GetRoundAmount;

        _roundObjects[0].SetActive(false);
    }

    void ShowRound()
    {
        foreach (GameObject roundobj in _roundObjects)
            _roundText = roundobj.GetComponent<Text>();

        _roundObjects[1].SetActive(false);
        _roundObjects[0].SetActive(true);

    }

    void DisableRound()
    {
        _roundObjects[0].SetActive(false);
        _roundObjects[1].SetActive(true);

        _roundText.text = "Round " + _roundManager.GetRoundAmount;
    }

}
