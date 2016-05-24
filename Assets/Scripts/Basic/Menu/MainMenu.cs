using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class MainMenu : MonoBehaviour {


    [SerializeField]
    private GameObject _loadingObject;

    [SerializeField]
    private List<GameObject> _falseObjects;


    // NEEDS DELEGATE. FIXING!
    [SerializeField]
    private RoundsSetUp _roundsSetUp;
    // NEEDS DELEGATE. FIXING!

    //Bool
    private bool _runOnce;
    [SerializeField] bool _adjustRound;
    //Bool

    void Start ()
    {
        if (_loadingObject != null)
        _loadingObject.SetActive(false);
    }

    public void PlayGame()
    {
        StartCoroutine("PlayButton");
    }

    public void GoToMenu()
    {
        Application.LoadLevel("Menu");
    }

    void Update()
    {
        if (_adjustRound)
        AdjustRound();    
    }

    void AdjustRound()
    {
        if (Input.GetAxis(ControllerInputs.allhorizontal) < 0)
        {
            if (!_runOnce)
            {
             if (_roundsSetUp.Round > 5)
             {
                 _roundsSetUp.MinRound--;
                 _runOnce = true;
             }          
            }
        }

        else if (Input.GetAxis(ControllerInputs.allhorizontal) > 0)
        {
            if (!_runOnce)
            {
                _roundsSetUp.AddRound++;
                _runOnce = true;
            }
        }

        else
        {
            _runOnce = false;
        }
    }

    private IEnumerator PlayButton()
    {
        foreach (GameObject falseobject in _falseObjects)
            if (falseobject != null)
            falseobject.SetActive(false);

        if (_loadingObject != null)
        _loadingObject.SetActive(true);


        AsyncOperation async = Application.LoadLevelAsync("SceneFerry2");


        while (!async.isDone)
        {
            _roundsSetUp.SaveResource();
            yield return null;
        }
    }
}
