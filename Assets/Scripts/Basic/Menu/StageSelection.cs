using UnityEngine;
using UnityEngine.UI;
using System.Collections;
using System.Collections.Generic;

public class StageSelection : MonoBehaviour
{

    public delegate void OnStageSelectHandler();
    public OnStageSelectHandler OnDungeonSelect;
    public OnStageSelectHandler OnBeachSelect;
    public OnStageSelectHandler OnDragonSelect;


    [SerializeField]
    private BestOfManager _bestOfManager;
    [SerializeField]
    private AudioSource _selectFX;

    [SerializeField]
    private Image _selectionImage;

    [SerializeField]
    private List<Sprite> _stageImages;
    [SerializeField]
    private int _stageSpot = 0;


    private bool _runOnce;

   void Update()
    {
      if (_bestOfManager.GetDoneSelection)
      {
          AdjustStage();
          RestoreCount();
          ChooseStage();
      }
       
           _selectionImage.sprite = _stageImages[_stageSpot];
    }

    void AdjustStage()
    {
        if (Input.GetAxis(ControllerInputs.allhorizontal) < 0)
        {
            if (!_runOnce)
            {
               _stageSpot -= 1;
               _selectFX.Play();
                    _runOnce = true;
                }

            }
            
            else if (Input.GetAxis(ControllerInputs.allhorizontal) > 0)
            {
                if (!_runOnce)
                {
                    _selectFX.Play();
                        _stageSpot += 1;
                        _runOnce = true;
                }
            }

            else
            {
                _runOnce = false;
            }
        }

    void RestoreCount()
    {
        if (_stageSpot >= _stageImages.Count)
            _stageSpot = 0;
        else if (_stageSpot < 0)
            _stageSpot = _stageImages.Count - 1;
    }

    void ChooseStage()
    {
        if (Input.GetKeyDown(KeyCode.Space))
        {
            if (_stageSpot == 0)
            {
                if (OnDungeonSelect != null)
                    OnDungeonSelect();
            }

            else if (_stageSpot == 1)
            {
                if (OnBeachSelect != null)
                    OnBeachSelect();
            }

            else if (_stageSpot == 2)
            {
                if (OnDragonSelect != null)
                    OnDragonSelect();
            }
        }
    }
    }