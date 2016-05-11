using UnityEngine;
using UnityEngine.UI;
using System.Collections;
using System.Collections.Generic;


public class RoundManager : MonoBehaviour {

    //int
    private int _amountOfRounds = 1;
    //int

    //List
    [SerializeField]
    private List<GameObject> _roundObjects;
    //List
    

    /*
     * 0 = Round Object for a new round.
     * 1 = Standard round object.
     */

    private Text _roundText;

    [SerializeField]
    private MatchStart _matchStart;

    private RoundsSetUp _roundSetUp;

	void Start () 
    {

        _roundSetUp = this.GetComponent<RoundsSetUp>();

        foreach (GameObject roundobj in _roundObjects)
            _roundText = roundobj.GetComponent<Text>();

        _roundText.text = "Round " + _amountOfRounds;

        _roundObjects[0].SetActive(false);   
	}

    void Update ()
    {
        if (_amountOfRounds > _roundSetUp.Round)
            StartCoroutine("StopGame");
    }

    public IEnumerator AddRound()
    {
        _amountOfRounds++;
            foreach (GameObject roundobj in _roundObjects)
                _roundText = roundobj.GetComponent<Text>();


            _roundObjects[1].SetActive(false);
            if (_amountOfRounds <= _roundSetUp.Round)
            {
            

            _roundObjects[0].SetActive(true);
            



            yield return new WaitForSeconds(2);

            _roundObjects[0].SetActive(false);
            _roundObjects[1].SetActive(true);

            _matchStart.StartCoroutine("StartNewRound");
            }
            _roundText.text = "Round " + _amountOfRounds;

           
    }

    private IEnumerator StopGame()
    {
        yield return new WaitForSeconds(3);
        Application.LoadLevel("Menu");
    }
}
